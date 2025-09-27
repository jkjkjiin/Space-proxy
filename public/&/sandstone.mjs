// sandstone.mjs
export const DEFAULT_REFERRER_POLICY = 'no-referrer';

/**
 * Clean request headers before proxying (remove cookies, auth headers, etc)
 * @param {Headers|Object} headers
 * @returns {Object} cleaned headers plain object
 */
export function cleanRequestHeaders(headers = {}) {
  const h = {};
  // copy safe headers and drop sensitive ones
  const forbidden = ['cookie', 'authorization', 'set-cookie', 'cookie2'];
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase();
    if (forbidden.includes(key)) continue;
    // drop common tracking headers if you want:
    if (key.startsWith('x-forwarded-') && !key.startsWith('x-forwarded-host')) continue;
    h[key] = v;
  }
  return h;
}

/**
 * Fetch through the network with privacy defaults:
 * - credentials: 'omit' (never send cookies)
 * - referrerPolicy: 'no-referrer'
 * - remove sensitive headers client-side
 */
export async function proxyFetch(url, { method = 'GET', headers = {}, body = undefined } = {}) {
  const cleaned = cleanRequestHeaders(headers);

  // Recommended fetch options for privacy and safety:
  const reqInit = {
    method,
    headers: cleaned,
    body,
    credentials: 'omit',          // never send cookies / credentials. See MDN.
    referrerPolicy: DEFAULT_REFERRER_POLICY,
    redirect: 'follow'
  };

  const res = await fetch(url, reqInit);

  // If you need to forward status/headers to the client, strip Set-Cookie & other sensitive ones
  const responseHeaders = {};
  for (const [k, v] of res.headers.entries()) {
    const low = k.toLowerCase();
    if (low === 'set-cookie' || low === 'set-cookie2') continue;
    // optionally drop server-identifying headers:
    if (low === 'server' || low === 'x-powered-by') continue;
    responseHeaders[k] = v;
  }

  // If content is HTML, sanitize it (function below).
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const text = await res.text();
    const sanitized = sanitizeHtmlForSandbox(text);
    return { status: res.status, headers: responseHeaders, body: sanitized, isHtml: true };
  }

  // For binary resources (images/js/css) return as ArrayBuffer so the client can create a blob
  const buffer = await res.arrayBuffer();
  return { status: res.status, headers: responseHeaders, body: buffer, isHtml: false };
}

/**
 * Sanitize HTML for embedding inside a strict sandboxed iframe.
 * - Removes <script> tags
 * - Removes inline "on..." handlers (onclick, onload, etc)
 * - Rewrites <a href> and resource URLs to pass back through the proxy (very small example)
 * - Injects strict CSP meta (sandboxing + disallow inline scripts/styles)
 */
export function sanitizeHtmlForSandbox(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Remove <script> and <noscript> completely
  doc.querySelectorAll('script, noscript').forEach(n => n.remove());

  // Remove inline event handlers: onload, onclick, etc
  const all = doc.querySelectorAll('*');
  for (const el of all) {
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    }
  }

  // Remove meta-refresh redirects
  doc.querySelectorAll('meta[http-equiv]').forEach(m => {
    const eq = (m.getAttribute('http-equiv') || '').toLowerCase();
    if (eq === 'refresh') m.remove();
  });

  // Simple resource rewriting example:
  const base = doc.querySelector('base')?.getAttribute('href') || '';
  doc.querySelectorAll('[src], [href]').forEach(el => {
    const attr = el.hasAttribute('src') ? 'src' : 'href';
    const v = el.getAttribute(attr);
    if (!v) return;
    // if absolute URL, rewrite to the proxy path (example)
    try {
      const u = new URL(v, base || window.location.origin);
      // only rewrite http(s) schemes
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        // your proxy endpoint; when integrating adapt to your backend route.
        el.setAttribute(attr, `/__sandstone_proxy?target=${encodeURIComponent(u.toString())}`);
      }
    } catch (e) {
      // leave relative or data: alone
    }
  });

  // Inject a strict CSP meta (disallow inline scripts/styles, disallow new sources)
  const csp = "default-src 'none'; script-src 'none'; connect-src 'self'; img-src data: https:; style-src 'self' 'unsafe-inline'"; 
  // Note: some sites break if you block styles; adjust style-src as needed.
  const meta = doc.createElement('meta');
  meta.setAttribute('http-equiv', 'Content-Security-Policy');
  meta.setAttribute('content', csp);
  doc.head.prepend(meta);

  // Return serialized string
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
