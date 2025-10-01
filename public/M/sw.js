if (navigator.userAgent.includes('Firefox')) {
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
        value: true,
        writable: false,
    });
}

importScripts('/M/meteor.codecs.js')
importScripts('/M/meteor.config.js')
importScripts('/M/meteor.bundle.js')
importScripts('/M/meteor.worker.js')

const meteor = new MeteorServiceWorker()
function handleRequest(event) {
  if (meteor.shouldRoute(event)) {
    return meteor.handleFetch(event)
  }

  return fetch(event.request)
}
self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event))
})
