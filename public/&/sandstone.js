// sandstone.js - parent-side bootstrap
(function (global) {
  function makeNonce(len = 24) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => ('0' + b.toString(16)).slice(-2)).join('');
  }

  function createProxyIframe() {
    const iframe = document.createElement('iframe');

    // Strict sandbox: no same-origin, but allow scripts so pages' JS can run
    // If you want to disallow *all* scripts, remove 'allow-scripts'.
    iframe.setAttribute('sandbox', 'allow-scripts'); // do NOT include allow-same-origin
    iframe.setAttribute('referrerpolicy', 'no-referrer'); // don't leak referrer
    // Use srcdoc blank and then send content via blob or postMessage handshake
    iframe.srcdoc = '<!doctype html><html><head></head><body></body></html>';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.setAttribute('loading', 'lazy');
    return iframe;
  }

  // postMessage helper with handshake token
  function setupIframeMessaging(iframe, onMessage, opts = {}) {
    const token = opts.token || makeNonce();
    const targetOrigin = '*'; // using token-based validation; you can restrict to specific origin too

    // Parent -> iframe: send init with token. iframe must echo token back on its side.
    function sendInit() {
      iframe.contentWindow.postMessage({ type: 'sandstone:init', token }, targetOrigin);
    }

    // Listen for verified messages from the frame
    function messageHandler(e) {
      const data = e.data || {};
      if (!data || typeof data !== 'object') return;
      // Expect: { type: 'sandstone:ready', token: '...' }
      if (data.type === 'sandstone:ready' && data.token === token) {
        // handshake completed
        if (opts.onReady) opts.onReady();
        return;
      }
      // All other messages must include token
      if (data.token !== token) return; // ignore forged messages
      onMessage && onMessage(data, e);
    }
    window.addEventListener('message', messageHandler);
    // attempt handshake a couple times (iframe might not be ready immediately)
    const h = setInterval(() => {
      try { sendInit(); } catch (err) {}
    }, 200);
    // stop after 5s
    setTimeout(() => clearInterval(h), 5000);
    return { token, destroy: () => window.removeEventListener('message', messageHandler) };
  }

  // Example API: mount(proxyContainer, targetUrl)
  async function mount(container, targetUrl) {
    const iframe = createProxyIframe();
    container.appendChild(iframe);

    // set up messaging and token handshake
    const { token } = setupIframeMessaging(iframe, (msg) => {
      // ex: handle click events forwarded from frame, or debug logs
      if (msg.type === 'sandstone:log') console.log('[frame]', msg.msg);
    }, { onReady: () => {
      // once the frame replies ready (handshake done) tell it which URL to render
      iframe.contentWindow.postMessage({ type: 'sandstone:render', url: targetUrl, token }, '*');
    }});

    return { iframe, token };
  }

  // Expose to global
  global.Sandstone = { mount };
})(window);
