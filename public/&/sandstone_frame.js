// sandstone_frame.js
// client-side helper to embed a proxied page with strict sandbox + token handshake
// Usage:
//   import { createSandstoneIframe } from './sandstone_frame.js';
//   const iframe = createSandstoneIframe('/proxy?url=https://example.com', { token: 'shared-token' });
//   document.body.appendChild(iframe.element);

export function createSandstoneIframe(proxyUrl, opts = {}) {
  const token = opts.token || null; // must match server-provided token or handshake
  const allowScripts = opts.allowScripts ? 'allow-scripts' : ''; // allow-scripts is sometimes needed
  const sandboxValue = ['allow-scripts'].filter(Boolean).join(' ').trim() || '';

  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', sandboxValue); // do NOT include allow-same-origin
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  iframe.setAttribute('loading', 'lazy');
  iframe.style.width = opts.width || '100%';
  iframe.style.height = opts.height || '100%';
  iframe.style.border = '0';

  // We will load proxyUrl by fetching it as a blob then setting iframe.src to blob URL.
  async function load() {
    try {
      const res = await fetch(proxyUrl, { credentials: 'omit' });
      if (!res.ok) {
        iframe.srcdoc = `<pre style="color: red;">Proxy fetch failed: ${res.status}</pre>`;
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      iframe.src = blobUrl;

      // Set up postMessage handshake
      window.addEventListener('message', function onMsg(ev) {
        if (ev.source !== iframe.contentWindow) return;
        const data = ev.data;
        if (!data || !data.__sandstone_token) return;
        if (token && data.__sandstone_token !== token) return;
        // user-provided callback
        if (opts.onMessage) opts.onMessage(data, ev);
      });

      iframe.addEventListener('load', () => {
        // Optionally send a handshake init to iframe contentWindow (may be cross-origin blob)
        try {
          iframe.contentWindow.postMessage({ __sandstone_token: token, type: 'init' }, '*');
        } catch (e) {
          // Some browsers may block postMessage to blob-based iframe; ignore
        }
      });
    } catch (e) {
      iframe.srcdoc = `<pre style="color: red;">Proxy fetch error: ${String(e)}</pre>`;
    }
  }

  // start load in background
  load();

  return {
    element: iframe,
    reload: load
  };
}
