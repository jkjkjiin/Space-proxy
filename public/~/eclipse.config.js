(() => { // webpackBootstrap
var __webpack_modules__ = ({});
/************************************************************************/
// The module cache
var __webpack_module_cache__ = {};

// The require function
function __webpack_require__(moduleId) {

// Check if module is in cache
var cachedModule = __webpack_module_cache__[moduleId];
if (cachedModule !== undefined) {
return cachedModule.exports;
}
// Create a new module (and put it into the cache)
var module = (__webpack_module_cache__[moduleId] = {
exports: {}
});
// Execute the module function
__webpack_modules__[moduleId](module, module.exports, __webpack_require__);

// Return the exports of the module
return module.exports;

}

/************************************************************************/
// webpack/runtime/rspack_version
(() => {
__webpack_require__.rv = function () {
	return "1.0.14";
};

})();
// webpack/runtime/rspack_unique_id
(() => {
__webpack_require__.ruid = "bundler=rspack@1.0.14";

})();
/************************************************************************/
const k = new TextEncoder().encode(btoa(new Date().toISOString().slice(0, 10) + location.host).split('').reverse().join('').slice(6.7));
self.__eclipse$config = {
    prefix: "/~/Space/",
	codec: self.__eclipse$codecs.base64,
    encodeUrl: s => {
        if (!s) return s;
        try {
            const d = new TextEncoder().encode(s), o = new Uint8Array(d.length);
            for (let i = 0; i < d.length; i++) o[i] = d[i] ^ k[i % 8];
            return Array.from(o, b => b.toString(16).padStart(2, "0")).join("");
        } catch { return s; }
    },
    decodeUrl: s => {
        if (!s) return s;
        try {
            const n = Math.min(s.indexOf('?') + 1 || s.length + 1, s.indexOf('#') + 1 || s.length + 1, s.indexOf('&') + 1 || s.length + 1) - 1;
            let h = 0;
            for (let i = 0; i < n && i < s.length; i++) {
                const c = s.charCodeAt(i);
                if (!((c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102))) break;
                h = i + 1;
            }
            if (h < 2 || h % 2) return decodeURIComponent(s);
            const l = h >> 1, o = new Uint8Array(l);
            for (let i = 0; i < l; i++) {
                const x = i << 1;
                o[i] = parseInt(s[x] + s[x + 1], 16) ^ k[i % 8];
            }
            return new TextDecoder().decode(o) + s.slice(h);
        } catch { return decodeURIComponent(s); }
    },
    codecs: "/e/eclipse.codecs.js",
    config: "/e/eclipse.config.js",
    rewrite: "/e/eclipse.rewrite.js",
    worker: "/e/eclipse.worker.js",
    client: "/e/eclipse.client.js"
},

})()
;
//# sourceMappingURL=eclipse.config.js.map
