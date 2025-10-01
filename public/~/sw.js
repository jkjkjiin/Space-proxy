if (navigator.userAgent.includes('Firefox')) {
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
        value: true,
        writable: false,
    });
}

importScripts("/~/eclipse.codecs.js");
importScripts("/~/eclipse.config.js");
importScripts("/~/eclipse.rewrite.js");
importScripts("/~/eclipse.worker.js");

const eclipse = new EclipseServiceWorker();

async function handleRequest(e) {
	if (eclipse.route(e)) {
		return await eclipse.fetch(e);
	}

	return await fetch(e.request);
}

self.addEventListener("fetch", (e) => {
	e.respondWith(handleRequest(e));
});
