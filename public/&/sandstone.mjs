// sandstone.mjs
// ES module proxy server with SSRF protections, keep-alive agents, streaming, header sanitization, CSP/sandbox
import express from 'express';
import rateLimit from 'express-rate-limit';
import http from 'http';
import https from 'https';
import dns from 'dns/promises';
import { URL } from 'url';
import net from 'net';
import crypto from 'crypto';

const PORT = Number(process.env.PORT || 8080);
const HOST_ALLOWLIST_PATTERNS = (process.env.HOST_ALLOWLIST || '^https?://([a-z0-9-]+\\.)*example\\.com(/|$)').split('|').map(s => new RegExp(s, 'i'));
const SANDBOX_TOKEN = process.env.SANDBOX_TOKEN || crypto.randomBytes(16).toString('hex'); // used for postMessage handshake

// Keep-alive agents to improve performance (reuse sockets/TLS)
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 200 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 200 });

// basic private IP detection (IPv4 and common IPv6 loopback)
function isPrivateIP(ip) {
  if (!ip) return false;
  // IPv4 private ranges and loopback
  if (/^(::1|127\.)/.test(ip)) return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  // IPv6 unique local addresses fc00::/7
  if (/^fc|^fd/.test(ip)) return true;
  return false;
}

// Validate URL, ensure allowlist match, ensure resolved IPs not private
async function validateTargetUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch (e) {
    const err = new Error('invalid-url');
    err.code = 'invalid-url';
    throw err;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    const err = new Error('unsupported-protocol');
    err.code = 'unsupported-protocol';
    throw err;
  }

  // Positive allowlist check: at least one regex must match the full url (host+path ok)
  if (!HOST_ALLOWLIST_PATTERNS.some(rx => rx.test(raw))) {
    const err = new Error('host-not-allowed');
    err.code = 'host-not-allowed';
    throw err;
  }

  // DNS-resolve host and ensure none of the addresses are private/local
  let addresses = [];
  try {
    // prefer A/AAAA records
    addresses = await dns.lookup(url.hostname, { all: true });
  } catch (e) {
    // DNS failure -> reject
    const err = new Error('dns-lookup-failed');
    err.code = 'dns-lookup-failed';
    throw err;
  }

  if (!addresses || addresses.length === 0) {
    const err = new Error('no-address-resolved');
    err.code = 'no-address-resolved';
    throw err;
  }

  for (const addr of addresses) {
    if (isPrivateIP(addr.address)) {
      const err = new Error('target-resolves-to-private-ip');
      err.code = 'target-resolves-to-private-ip';
      throw err;
    }
  }
  return url;
}

// Minimal header whitelist from client -> upstream (only allowed safe headers)
const CLIENT_TO_UPSTREAM_HEADER_WHITELIST = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'user-agent',
  // keep others out (no cookies, no authorization forwarded)
]);

// Upstream response headers we allow to pass (others are stripped)
const UPSTREAM_RESPONSE_ALLOW = new Set([
  'content-type',
  'content-length',
  'content-encoding',
  'cache-control',
  'etag',
  'last-modified',
  'expires',
  // we will intentionally set/refine security headers below
]);

// Express app
const app = express();

// Basic rate limiter for /proxy endpoint (tune to your needs)
app.use('/proxy', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
}));

// Helper: send JSON error
function sendError(res, status = 400, code = 'error', message = '') {
  res.status(status).json({ error: code, message });
}

// Proxy endpoint: GET only (safe default). Use query param "url" to supply destination.
// Example: /proxy?url=https://example.com/path
app.get('/proxy', async (req, res) => {
  const raw = req.query.url;
  if (!raw) return sendError(res, 400, 'missing-url', 'Missing "url" query parameter');

  let url;
  try {
    url = await validateTargetUrl(String(raw));
  } catch (err) {
    console.warn('validation failed:', err.code || err.message);
    return sendError(res, 400, err.code || 'invalid', err.message);
  }

  // Build headers to upstream: only allow safe ones from client
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (CLIENT_TO_UPSTREAM_HEADER_WHITELIST.has(k)) headers[k] = v;
  }
  // Force no cookies and no auth forwarding
  delete headers.cookie;
  delete headers.authorization;
  // Identify ourselves minimally (avoid leaking server internals)
  headers['x-forwarded-for'] = req.ip || req.socket.remoteAddress || '';

  const agent = url.protocol === 'https:' ? httpsAgent : httpAgent;
  const client = url.protocol === 'https:' ? https : http;

  const requestOptions = {
    method: 'GET',
    headers,
    agent,
    timeout: Number(process.env.UPSTREAM_TIMEOUT_MS || 30_000),
  };

  // Issue upstream request using low-level request API so we can inspect status/headers and stream
  const upstreamReq = client.request(url, requestOptions, upstreamRes => {
    // If upstream returns a redirect, reject it by default (prevents allowlist bypasses)
    if (upstreamRes.statusCode >= 300 && upstreamRes.statusCode < 400) {
      // Optionally: validate Location and allow only if it still matches allowlist and not private
      console.warn('blocked upstream redirect', upstreamRes.statusCode, upstreamRes.headers.location);
      // consume upstream body and respond with error
      upstreamRes.resume();
      return sendError(res, 502, 'upstream-redirect-blocked', 'Upstream redirect blocked');
    }

    // Build sanitized response headers
    const safeHeaders = {};
    for (const [k, v] of Object.entries(upstreamRes.headers)) {
      const low = k.toLowerCase();
      if (low === 'set-cookie' || low === 'set-cookie2') {
        // strip cookies to protect privacy
        continue;
      }
      if (UPSTREAM_RESPONSE_ALLOW.has(low)) {
        safeHeaders[low] = v;
      }
    }

    // Security + Privacy headers we enforce:
    // - force CSP sandbox to limit what proxied content can do
    // - never allow the proxied document to obtain referrer information
    // - restrict permissions (geolocation/camera/microphone)
    safeHeaders['referrer-policy'] = 'no-referrer';
    // This CSP gives a strong sandbox. If you need to allow certain resources, extend it carefully.
    // Important: sandbox directive in CSP 3 can be used to apply sandboxing to the document.
    safeHeaders['content-security-policy'] = "sandbox allow-scripts; object-src 'none'; base-uri 'none';";
    safeHeaders['permissions-policy'] = 'geolocation=(), microphone=(), camera=()';
    // Prevent content sniffing
    safeHeaders['x-content-type-options'] = 'nosniff';
    // HSTS is left to your TLS front (reverse proxy). We don't set HSTS here because proxy may be used via http during testing.

    // Add a small header indicating we proxied it (avoid leaking internals)
    safeHeaders['x-sandstone-proxied'] = '1';

    // Send status and headers to client
    res.writeHead(upstreamRes.statusCode || 200, safeHeaders);

    // Stream upstream body to client (memory efficient)
    upstreamRes.pipe(res, { end: true });
  });

  upstreamReq.on('timeout', () => {
    upstreamReq.destroy(new Error('upstream-timeout'));
  });

  upstreamReq.on('error', (err) => {
    console.error('upstream request error', err && (err.code || err.message));
    if (!res.headersSent) return sendError(res, 502, 'bad-gateway', 'Upstream request failed');
    try { res.end(); } catch (_) {}
  });

  // We do not send any body (GET)
  upstreamReq.end();
});

// Endpoint to serve an iframe wrapper page for a given proxied URL (optional convenience).
// It returns a minimal HTML page that loads the proxied content inside a blob iframe
// and uses a token-based handshake to allow limited postMessage communication.
app.get('/iframe', async (req, res) => {
  const raw = req.query.url;
  if (!raw) return sendError(res, 400, 'missing-url', 'Missing "url" query parameter');
  // Validate but do not proxy through here; iframe page will fetch via /proxy?url=...
  try {
    await validateTargetUrl(String(raw));
  } catch (err) {
    return sendError(res, 400, err.code || 'invalid', err.message);
  }

  // Minimal HTML that creates an iframe and loads /proxy?url=... inside it using fetch + blob URL
  const token = SANDBOX_TOKEN; // for demo; you can generate per-session and return it here
  const escapedUrl = String(raw).replace(/"/g, '&quot;');
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="referrer" content="no-referrer">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <title>Sandstone Proxy Frame</title>
    <script>
      // This page will fetch the proxied resource from /proxy and create a blob URL to host in iframe
      (function(){
        const PROXY_ENDPOINT = '/proxy?url=${escapedUrl}';
        const TOKEN = '${token}';
        async function init() {
          try {
            const r = await fetch(PROXY_ENDPOINT, { credentials: 'omit' });
            if (!r.ok) {
              document.body.innerText = 'Proxy fetch failed: ' + r.status;
              return;
            }
            const contentType = r.headers.get('content-type') || 'text/html';
            const blob = await r.blob();
            const blobUrl = URL.createObjectURL(blob);
            const iframe = document.createElement('iframe');
            iframe.src = blobUrl;
            // strict sandbox: do NOT allow same-origin; allow only scripts if needed (no forms/popups by default)
            iframe.setAttribute('sandbox', 'allow-scripts');
            iframe.setAttribute('referrerpolicy', 'no-referrer');
            iframe.style = "width:100%;height:100vh;border:0;margin:0;padding:0;";
            document.body.appendChild(iframe);

            // handshake: authorized messages must include TOKEN
            window.addEventListener('message', (ev) => {
              // verify source is the iframe window
              if (ev.source !== iframe.contentWindow) return;
              const data = ev.data;
              if (!data || data.__sandstone_token !== TOKEN) return;
              // handle authorized messages from the proxied page
              // (for demo we just post a response back)
              if (data.type === 'hello') {
                ev.source.postMessage({ __sandstone_token: TOKEN, type: 'ack', time: Date.now() }, '*');
              }
            }, false);

            // Optional: pass the token to the iframe via postMessage once it's loaded
            iframe.addEventListener('load', () => {
              try {
                iframe.contentWindow.postMessage({ __sandstone_token: TOKEN, type: 'init' }, '*');
              } catch (e) { /* postMessage to cross-origin blob may throw, ignore */ }
            });
          } catch (e) {
            document.body.innerText = 'Proxy fetch error: ' + (e && e.message);
          }
        }
        init();
      })();
    </script>
    <style>html,body{height:100%;margin:0}</style>
  </head>
  <body></body>
</html>`;

  res.setHeader('content-type', 'text/html; charset=utf-8');
  // For this wrapper, we do not set CSP sandbox here because the iframe itself will be sandboxed.
  res.send(html);
});

// Quick health endpoint
app.get('/_health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Sandstone proxy listening on http://localhost:${PORT}`);
  console.log('SANDBOX_TOKEN (for iframe handshake):', SANDBOX_TOKEN);
});
