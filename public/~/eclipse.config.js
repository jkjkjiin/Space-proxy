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
self.__eclipse$config = {
    prefix: "/~/daydream/",
    codec: self.__eclipse$codecs.base64,
    codecs: "/~/eclipse.codecs.js",
    config: "/~/eclipse.config.js",
    rewrite: "/~/eclipse.rewrite.js",
    worker: "/~/eclipse.worker.js",
    client: "/~/eclipse.client.js"
};

})()
;
//# sourceMappingURL=eclipse.config.js.map
