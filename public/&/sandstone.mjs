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
