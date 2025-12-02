/*global UVServiceWorker,__uv$config*/
/*
 * Stock service worker script.
 * Users can provide their own sw.js if they need to extend the functionality of the service worker.
 * Ideally, this will be registered under the scope in uv.config.js so it will not need to be modified.
 * However, if a user changes the location of uv.bundle.js/uv.config.js or sw.js is not relative to them, they will need to modify this script locally.
 */
importScripts("/@/uv.bundle.js");
importScripts("/@/uv.config.js");
//importScripts('/$/scramjet.shared.js');
//importScripts('/$/scramjet.worker.js');
importScripts('/$/scramjet.all.js');
importScripts("/@/ww/workerware.js");
importScripts(__uv$config.sw || "/@/uv.sw.js");
const uv = new UVServiceWorker();
const ww = new WorkerWare({ debug: false });
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const sj = new ScramjetServiceWorker();
(async function () {
        await sj.loadConfig();
})();
//me when Firefox (thanks vk6)
if (navigator.userAgent.includes("Firefox")) {
    Object.defineProperty(globalThis, "crossOriginIsolated", {
        value: true,
        writable: true
    });
}

//where we handle our plugins!!!
self.addEventListener("message", function (event) {
    console.log(event.data);
    uv.config.inject = [];
    //loop over the required data (we don't verify here as types will take care of us :D)
    event.data.forEach((data) => {
        if (data.remove) {
            if (data.type === "page") {
                const idx = uv.config.inject.indexOf(data.host);
                uv.config.inject.splice(idx, 1);
            } else if (data.type === "serviceWorker") {
                ww.deleteByName(data.name);
            }
        } else {
            if (data.type === "page") {
                uv.config.inject.push({
                    host: data.host,
                    html: data.html,
                    injectTo: data.injectTo
                });
            } else if (data.type === "serviceWorker") {
                const wwFunction = eval(data.function);
                ww.use({
                    function: wwFunction ? wwFunction : new Function(data.function),
                    name: data.name,
                    events: data.events
                });
            } else {
                console.error("NO type exists for that. Only serviceWorker & page exist.");
                return;
            }
        }
    });
});

self.addEventListener("fetch", function (event) {
    event.respondWith(
        (async () => {
            const wwRes = await ww.run(event)();
            if (wwRes.includes(null)) {
                return;
            }
            if (event.request.url.startsWith(location.origin + __uv$config.prefix)) {
                return await uv.fetch(event);
            } 
            else if (sj.route(event)) {
                return await sj.fetch(event);
            }
            else {
                return await fetch(event.request);
            }
        })()
    );
});
