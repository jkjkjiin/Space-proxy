// sandstone_frame.js - to be included inside the iframe's initial srcdoc
(function () {
  // internal state
  let TOKEN = null;
  // Listen for parent init
  window.addEventListener('message', async (e) => {
    const data = e.data || {};
    if (!data || typeof data !== 'object') return;

    if (data.type === 'sandstone:init' && data.token) {
      TOKEN = data.token;
      // reply ready
      window.parent.postMessage({ type: 'sandstone:ready', token: TOKEN }, '*');
      return;
    }

    // Only accept messages with correct token
    if (data.token !== TOKEN) return;

    if (data.type === 'sandstone:render' && data.url) {
      try {
        // request sanitized HTML via parent's proxy endpoint (same origin relative path)
        // Note: inside the sandbox WITHOUT allow-same-origin, fetch will originate from a unique origin.
        // So we ask parent to supply the sanitized HTML instead (use postMessage approach)
        // Here we ask parent to fetch on our behalf and send back the sanitized HTML.
        // But if your server provides /__sandstone_proxy that takes ?target=..., you could fetch directly.
        // We'll attempt to fetch directly first, but fallback to asking parent.
        let html;
        try {
          const resp = await fetch(data.url, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'follow' });
          html = await resp.text();
          // We still will sanitize a bit locally (remove scripts)
          html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
        } catch (err) {
          // Signal parent to fetch and return sanitized content
          window.parent.postMessage({ type: 'sandstone:requestFetch', url: data.url, token: TOKEN }, '*');
          return;
        }

        // Render: replace the document with the returned HTML
        document.open();
        document.write(html);
        document.close();

      } catch (err) {
        // report error to parent
        window.parent.postMessage({ type: 'sandstone:error', msg: String(err), token: TOKEN }, '*');
      }
    }

    // other message types...
  });

  // Forward clicks/navigation events to parent so parent can decide to proxy them
  document.addEventListener('click', (ev) => {
    let a = ev.target.closest && ev.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    ev.preventDefault();
    window.parent.postMessage({ type: 'sandstone:navigate', href, token: TOKEN }, '*');
  }, true);
})();
