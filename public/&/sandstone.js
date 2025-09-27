// sandstone.js (excerpt / drop-in helpers)
// Requires: node >= 14
const http = require('http');
const https = require('https');
const { URL } = require('url');
const net = require('net');
const express = require('express');
const rateLimit = require('express-rate-limit'); // optional dependency

// Reuse sockets for performance
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100 });

// simple allowlist (only allow http(s) to these domains/patterns)
const HOST_ALLOWLIST = [
  /^https?:\/\/(www\.)?example\.com(\/|$)/i,
  /^https?:\/\/static\.trustedcdn\.example(\/|$)/i
];

// helper: reject private/local IPs to prevent SSRF
function isPrivateIP(ip) {
  // covers IPv4 private ranges and loopback
  return /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(ip);
}

async function validateTargetUrl(targetUrl) {
  let url;
  try { url = new URL(targetUrl); }
  catch (e) { throw new Error('invalid-url'); }

  if (!/^https?:$/.test(url.protocol)) throw new Error('unsupported-protocol');

  // positive allowlist check: at least one pattern must match
  if (!HOST_ALLOWLIST.some(rx => rx.test(targetUrl))) throw new Error('host-not-allowed');

  // Resolve DNS and check IP (prevent local IPs)
  const lookup = await new Promise((res, rej) => {
    require('dns').lookup(url.hostname, { all: true }, (err, addresses) => {
      if (err) return rej(err);
      res(addresses);
    });
  });
  for (const addr of lookup) {
    if (isPrivateIP(addr.address)) throw new Error('target-resolves-to-private-ip');
  }
  return url;
}

// Express app skeleton
const app = express();

// Basic rate-limiter (adjust to your needs)
app.use('/proxy', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300 // per IP
}));

app.get('/proxy', async (req, res) => {
  const target = req.query.url;
  try {
    const url = await validateTargetUrl(target);

    // Build proxied request headers — whitelist only safe ones
    const forwardHeaders = {};
    const keep = ['accept', 'accept-encoding', 'accept-language', 'user-agent'];
    for (const h of keep) if (req.get(h)) forwardHeaders[h] = req.get(h);

    // remove cookie/referrer/authorization by default
    // Add strict referrer policy on proxied responses (see below)
    const options = {
      method: 'GET',
      headers: forwardHeaders,
      agent: url.protocol === 'https:' ? httpsAgent : httpAgent,
      timeout: 30_000
    };

    const client = url.protocol === 'https:' ? https : http;
    const upstream = client.request(url, options, upstreamRes => {
      // sanitize response headers before sending to client
      const safeHeaders = {};
      for (const [k, v] of Object.entries(upstreamRes.headers)) {
        const low = k.toLowerCase();
        if (low === 'set-cookie' || low === 'set-cookie2') continue; // strip cookies
        if (['server', 'x-powered-by'].includes(low)) continue;
        // allow content-type, content-length, content-encoding, cache-control, etag, last-modified
        if (['content-type','content-length','content-encoding','cache-control','etag','last-modified'].includes(low)) {
          safeHeaders[low] = v;
        }
      }
      // Strong privacy/security headers
      safeHeaders['referrer-policy'] = 'no-referrer';
      safeHeaders['content-security-policy'] = "sandbox;"; // force sandboxing of proxied document
      safeHeaders['permissions-policy'] = 'geolocation=(), microphone=(), camera=()';
      res.writeHead(upstreamRes.statusCode, safeHeaders);

      // stream body through
      upstreamRes.pipe(res, { end: true });
    });

    upstream.on('error', e => {
      console.error('upstream error', e);
      if (!res.headersSent) res.status(502).send('bad gateway');
      else res.end();
    });
    upstream.end();
  } catch (err) {
    console.warn('proxy validation failed', err.message || err);
    res.status(400).json({ error: err.message || 'invalid request' });
  }
});

// start
app.listen(8080, ()=>console.log('proxy listening'));
