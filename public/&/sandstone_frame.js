// sandstone_frame.js (client-side snippet)

// create an iframe for the proxied content
function createProxyIframe(htmlBlobUrl) {
  const iframe = document.createElement('iframe');

  // Tight sandbox attributes: allow only what you actually need.
  // Do NOT allow 'allow-same-origin' unless absolutely required (it gives the iframe same origin).
  // Typical safe minimal sandbox: scripts might be needed, but block forms/popups/plugins.
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms'); // revise per feature needs
  iframe.setAttribute('referrerpolicy', 'no-referrer'); // never send Referer from iframe
  iframe.setAttribute('loading', 'lazy'); // speed: let browser prioritize
  iframe.src = htmlBlobUrl;

  // set a strict Content-Security-Policy on the served blob/page (server-side header)
  // Use postMessage with origin checks for any communication
  window.addEventListener('message', function onMsg(ev) {
    // verify origin is exactly the iframe's origin (or 'null' for blob/data URLs)
    // If using blob/data URLs, validate the event.source === iframe.contentWindow and use a shared token
    if (ev.source !== iframe.contentWindow) return;
    const data = ev.data;
    // validate that message shape / token is expected
    if (!data || data.__sandstone_token !== EXPECTED_TOKEN) return;
    // handle safe messages ...
  });

  return iframe;
}
