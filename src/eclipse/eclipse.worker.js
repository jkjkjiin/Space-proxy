(() => { // webpackBootstrap
"use strict";
var __webpack_modules__ = ({
"./node_modules/@mercuryworkshop/bare-mux/dist/index.mjs": (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  BareClient: function() { return k; },
  BareMuxConnection: function() { return m; },
  BareWebSocket: function() { return w; },
  WebSocketFields: function() { return n; },
  WorkerConnection: function() { return p; },
  browserSupportsTransferringStreams: function() { return d; },
  "default": function() { return k; },
  maxRedirects: function() { return e; },
  validProtocol: function() { return g; }
});
const e=20,t=globalThis.fetch,r=globalThis.SharedWorker,a=globalThis.localStorage,s=globalThis.navigator.serviceWorker,o=MessagePort.prototype.postMessage,n={prototype:{send:WebSocket.prototype.send},CLOSED:WebSocket.CLOSED,CLOSING:WebSocket.CLOSING,CONNECTING:WebSocket.CONNECTING,OPEN:WebSocket.OPEN};async function c(){const e=(await self.clients.matchAll({type:"window",includeUncontrolled:!0})).map((async e=>{const t=await function(e){let t=new MessageChannel;return new Promise((r=>{e.postMessage({type:"getPort",port:t.port2},[t.port2]),t.port1.onmessage=e=>{r(e.data)}}))}(e);return await i(t),t})),t=Promise.race([Promise.any(e),new Promise(((e,t)=>setTimeout(t,1e3,new TypeError("timeout"))))]);try{return await t}catch(e){if(e instanceof AggregateError)throw console.error("bare-mux: failed to get a bare-mux SharedWorker MessagePort as all clients returned an invalid MessagePort."),new Error("All clients returned an invalid MessagePort.");return console.warn("bare-mux: failed to get a bare-mux SharedWorker MessagePort within 1s, retrying"),await c()}}function i(e){const t=new MessageChannel,r=new Promise(((e,r)=>{t.port1.onmessage=t=>{"pong"===t.data.type&&e()},setTimeout(r,1500)}));return o.call(e,{message:{type:"ping"},port:t.port2},[t.port2]),r}function l(e,t){const a=new r(e,"bare-mux-worker");return t&&s.addEventListener("message",(t=>{if("getPort"===t.data.type&&t.data.port){console.debug("bare-mux: recieved request for port from sw");const a=new r(e,"bare-mux-worker");o.call(t.data.port,a.port,[a.port])}})),a.port}let h=null;function d(){if(null===h){const e=new MessageChannel,t=new ReadableStream;let r;try{o.call(e.port1,t,[t]),r=!0}catch(e){r=!1}return h=r,r}return h}class p{constructor(e){this.channel=new BroadcastChannel("bare-mux"),e instanceof MessagePort||e instanceof Promise?this.port=e:this.createChannel(e,!0)}createChannel(e,t){if(self.clients)this.port=c(),this.channel.onmessage=e=>{"refreshPort"===e.data.type&&(this.port=c())};else if(e&&SharedWorker){if(!e.startsWith("/")&&!e.includes("://"))throw new Error("Invalid URL. Must be absolute or start at the root.");this.port=l(e,t),console.debug("bare-mux: setting localStorage bare-mux-path to",e),a["bare-mux-path"]=e}else{if(!SharedWorker)throw new Error("Unable to get a channel to the SharedWorker.");{const e=a["bare-mux-path"];if(console.debug("bare-mux: got localStorage bare-mux-path:",e),!e)throw new Error("Unable to get bare-mux workerPath from localStorage.");this.port=l(e,t)}}}async sendMessage(e,t){this.port instanceof Promise&&(this.port=await this.port);try{await i(this.port)}catch{return console.warn("bare-mux: Failed to get a ping response from the worker within 1.5s. Assuming port is dead."),this.createChannel(),await this.sendMessage(e,t)}const r=new MessageChannel,a=[r.port2,...t||[]],s=new Promise(((e,t)=>{r.port1.onmessage=r=>{const a=r.data;"error"===a.type?t(a.error):e(a)}}));return o.call(this.port,{message:e,port:r.port2},a),await s}}class w extends EventTarget{constructor(e,t=[],r,a){super(),this.protocols=t,this.readyState=n.CONNECTING,this.url=e.toString(),this.protocols=t;const s=e=>{this.protocols=e,this.readyState=n.OPEN;const t=new Event("open");this.dispatchEvent(t)},o=async e=>{const t=new MessageEvent("message",{data:e});this.dispatchEvent(t)},c=(e,t)=>{this.readyState=n.CLOSED;const r=new CloseEvent("close",{code:e,reason:t});this.dispatchEvent(r)},i=()=>{this.readyState=n.CLOSED;const e=new Event("error");this.dispatchEvent(e)};this.channel=new MessageChannel,this.channel.port1.onmessage=e=>{"open"===e.data.type?s(e.data.args[0]):"message"===e.data.type?o(e.data.args[0]):"close"===e.data.type?c(e.data.args[0],e.data.args[1]):"error"===e.data.type&&i()},r.sendMessage({type:"websocket",websocket:{url:e.toString(),protocols:t,requestHeaders:a,channel:this.channel.port2}},[this.channel.port2])}send(...e){if(this.readyState===n.CONNECTING)throw new DOMException("Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.");let t=e[0];t.buffer&&(t=t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength)),o.call(this.channel.port1,{type:"data",data:t},t instanceof ArrayBuffer?[t]:[])}close(e,t){o.call(this.channel.port1,{type:"close",closeCode:e,closeReason:t})}}function u(e,t,r){console.error(`error while processing '${r}': `,t),e.postMessage({type:"error",error:t})}function g(e){for(let t=0;t<e.length;t++){const r=e[t];if(!"!#$%&'*+-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ^_`abcdefghijklmnopqrstuvwxyz|~".includes(r))return!1}return!0}const f=["ws:","wss:"],y=[101,204,205,304],b=[301,302,303,307,308];class m{constructor(e){this.worker=new p(e)}async getTransport(){return(await this.worker.sendMessage({type:"get"})).name}async setTransport(e,t,r){await this.setManualTransport(`\n\t\t\tconst { default: BareTransport } = await import("${e}");\n\t\t\treturn [BareTransport, "${e}"];\n\t\t`,t,r)}async setManualTransport(e,t,r){if("bare-mux-remote"===e)throw new Error("Use setRemoteTransport.");await this.worker.sendMessage({type:"set",client:{function:e,args:t}},r)}async setRemoteTransport(e,t){const r=new MessageChannel;r.port1.onmessage=async t=>{const r=t.data.port,a=t.data.message;if("fetch"===a.type)try{e.ready||await e.init(),await async function(e,t,r){const a=await r.request(new URL(e.fetch.remote),e.fetch.method,e.fetch.body,e.fetch.headers,null);if(!d()&&a.body instanceof ReadableStream){const e=new Response(a.body);a.body=await e.arrayBuffer()}a.body instanceof ReadableStream||a.body instanceof ArrayBuffer?o.call(t,{type:"fetch",fetch:a},[a.body]):o.call(t,{type:"fetch",fetch:a})}(a,r,e)}catch(e){u(r,e,"fetch")}else if("websocket"===a.type)try{e.ready||await e.init(),await async function(e,t,r){const[a,s]=r.connect(new URL(e.websocket.url),e.websocket.protocols,e.websocket.requestHeaders,(t=>{o.call(e.websocket.channel,{type:"open",args:[t]})}),(t=>{t instanceof ArrayBuffer?o.call(e.websocket.channel,{type:"message",args:[t]},[t]):o.call(e.websocket.channel,{type:"message",args:[t]})}),((t,r)=>{o.call(e.websocket.channel,{type:"close",args:[t,r]})}),(t=>{o.call(e.websocket.channel,{type:"error",args:[t]})}));e.websocket.channel.onmessage=e=>{"data"===e.data.type?a(e.data.data):"close"===e.data.type&&s(e.data.closeCode,e.data.closeReason)},o.call(t,{type:"websocket"})}(a,r,e)}catch(e){u(r,e,"websocket")}},await this.worker.sendMessage({type:"set",client:{function:"bare-mux-remote",args:[r.port2,t]}},[r.port2])}getInnerPort(){return this.worker.port}}class k{constructor(e){this.worker=new p(e)}createWebSocket(e,t=[],r,a){try{e=new URL(e)}catch(t){throw new DOMException(`Faiiled to construct 'WebSocket': The URL '${e}' is invalid.`)}if(!f.includes(e.protocol))throw new DOMException(`Failed to construct 'WebSocket': The URL's scheme must be either 'ws' or 'wss'. '${e.protocol}' is not allowed.`);Array.isArray(t)||(t=[t]),t=t.map(String);for(const e of t)if(!g(e))throw new DOMException(`Failed to construct 'WebSocket': The subprotocol '${e}' is invalid.`);a=a||{};return new w(e,t,this.worker,a)}async fetch(e,r){const a=new Request(e,r),s=r?.headers||a.headers,o=s instanceof Headers?Object.fromEntries(s):s,n=a.body;let c=new URL(a.url);if(c.protocol.startsWith("blob:")){const e=await t(c),r=new Response(e.body,e);return r.rawHeaders=Object.fromEntries(e.headers),r.rawResponse=e,r}for(let e=0;;e++){let t=(await this.worker.sendMessage({type:"fetch",fetch:{remote:c.toString(),method:a.method,headers:o,body:n||void 0}},n?[n]:[])).fetch,s=new Response(y.includes(t.status)?void 0:t.body,{headers:new Headers(t.headers),status:t.status,statusText:t.statusText});s.rawHeaders=t.headers,s.finalURL=c.toString();const i=r?.redirect||a.redirect;if(!b.includes(s.status))return s;switch(i){case"follow":{const t=s.headers.get("location");if(20>e&&null!==t){c=new URL(t,c);continue}throw new TypeError("Failed to fetch")}case"error":throw new TypeError("Failed to fetch");case"manual":return s}}}}console.debug("bare-mux: running v2.1.6 (build 4b7607b)");
//# sourceMappingURL=index.mjs.map


}),

});
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
// webpack/runtime/define_property_getters
(() => {
__webpack_require__.d = function(exports, definition) {
	for(var key in definition) {
        if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
            Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
        }
    }
};
})();
// webpack/runtime/has_own_property
(() => {
__webpack_require__.o = function (obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
};

})();
// webpack/runtime/make_namespace_object
(() => {
// define __esModule on exports
__webpack_require__.r = function(exports) {
	if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
	}
	Object.defineProperty(exports, '__esModule', { value: true });
};

})();
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
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__);
/* ESM import */var _mercuryworkshop_bare_mux__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @mercuryworkshop/bare-mux */ "./node_modules/@mercuryworkshop/bare-mux/dist/index.mjs");
function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
}
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self1 = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self1, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _iterable_to_array_limit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _s, _e;
    try {
        for(_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true){
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
        }
    } catch (err) {
        _d = true;
        _e = err;
    } finally{
        try {
            if (!_n && _i["return"] != null) _i["return"]();
        } finally{
            if (_d) throw _e;
        }
    }
    return _arr;
}
function _non_iterable_rest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
function _ts_generator(thisArg, body) {
    var f, y, t, g, _ = {
        label: 0,
        sent: function() {
            if (t[0] & 1) throw t[1];
            return t[1];
        },
        trys: [],
        ops: []
    };
    return g = {
        next: verb(0),
        "throw": verb(1),
        "return": verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;
    function verb(n) {
        return function(v) {
            return step([
                n,
                v
            ]);
        };
    }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while(_)try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [
                op[0] & 2,
                t.value
            ];
            switch(op[0]){
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [
                        0
                    ];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [
                6,
                e
            ];
            y = 0;
        } finally{
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
}

self.EclipseServiceWorker = /*#__PURE__*/ function() {
    "use strict";
    function EclipseServiceWorker() {
        _class_call_check(this, EclipseServiceWorker);
        _define_property(this, "client", void 0);
        this.client = new _mercuryworkshop_bare_mux__WEBPACK_IMPORTED_MODULE_0__.BareClient();
    }
    _create_class(EclipseServiceWorker, [
        {
            key: "route",
            value: function route(param) {
                var request = param.request;
                return request.url.startsWith(location.origin + self.__eclipse$config.prefix);
            }
        },
        {
            key: "fetch",
            value: function fetch1(param) {
                var request = param.request;
                var _this = this;
                return _async_to_generator(function() {
                    var files, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, file, err, url, requestHeaders, response, responseHeaders, body, contentType, _, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, contentDisposition, type, _response_finalURL_split_reverse, filename, error;
                    return _ts_generator(this, function(_state) {
                        switch(_state.label){
                            case 0:
                                if (!!request.url.startsWith(location.origin + self.__eclipse$config.prefix)) return [
                                    3,
                                    2
                                ];
                                return [
                                    4,
                                    fetch(request)
                                ];
                            case 1:
                                return [
                                    2,
                                    _state.sent()
                                ];
                            case 2:
                                files = [
                                    "codecs",
                                    "config",
                                    "rewrite",
                                    "worker",
                                    "client"
                                ];
                                _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                                _state.label = 3;
                            case 3:
                                _state.trys.push([
                                    3,
                                    8,
                                    9,
                                    10
                                ]);
                                _iterator = files[Symbol.iterator]();
                                _state.label = 4;
                            case 4:
                                if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                    3,
                                    7
                                ];
                                file = _step.value;
                                if (!(request.url == location.origin + self.__eclipse$config[file])) return [
                                    3,
                                    6
                                ];
                                return [
                                    4,
                                    fetch(request)
                                ];
                            case 5:
                                return [
                                    2,
                                    _state.sent()
                                ];
                            case 6:
                                _iteratorNormalCompletion = true;
                                return [
                                    3,
                                    4
                                ];
                            case 7:
                                return [
                                    3,
                                    10
                                ];
                            case 8:
                                err = _state.sent();
                                _didIteratorError = true;
                                _iteratorError = err;
                                return [
                                    3,
                                    10
                                ];
                            case 9:
                                try {
                                    if (!_iteratorNormalCompletion && _iterator.return != null) {
                                        _iterator.return();
                                    }
                                } finally{
                                    if (_didIteratorError) {
                                        throw _iteratorError;
                                    }
                                }
                                return [
                                    7
                                ];
                            case 10:
                                _state.trys.push([
                                    10,
                                    41,
                                    ,
                                    42
                                ]);
                                url = self.__eclipse$rewrite.url.decode(request.url);
                                return [
                                    4,
                                    self.__eclipse$rewrite.headers.request(Object.assign({}, request.headers), request.url)
                                ];
                            case 11:
                                requestHeaders = _state.sent();
                                return [
                                    4,
                                    _this.client.fetch(url, {
                                        method: request.method,
                                        body: request.body,
                                        headers: requestHeaders,
                                        credentials: "omit",
                                        mode: request.mode === "cors" ? request.mode : "same-origin",
                                        cache: request.cache,
                                        redirect: request.redirect,
                                        //@ts-ignore
                                        duplex: "half"
                                    })
                                ];
                            case 12:
                                response = _state.sent();
                                return [
                                    4,
                                    self.__eclipse$rewrite.headers.response(//@ts-ignore
                                    response.rawHeaders, request.url)
                                ];
                            case 13:
                                responseHeaders = _state.sent();
                                if (!response.body) return [
                                    3,
                                    40
                                ];
                                contentType = responseHeaders.has("content-type") && responseHeaders.get("content-type");
                                _ = request.destination;
                                switch(_){
                                    case "iframe":
                                        return [
                                            3,
                                            14
                                        ];
                                    case "document":
                                        return [
                                            3,
                                            14
                                        ];
                                    case "sharedworker":
                                        return [
                                            3,
                                            24
                                        ];
                                    case "worker":
                                        return [
                                            3,
                                            24
                                        ];
                                    case "serviceworker":
                                        return [
                                            3,
                                            24
                                        ];
                                    case "script":
                                        return [
                                            3,
                                            24
                                        ];
                                    case "style":
                                        return [
                                            3,
                                            26
                                        ];
                                    case "manifest":
                                        return [
                                            3,
                                            28
                                        ];
                                }
                                return [
                                    3,
                                    30
                                ];
                            case 14:
                                if (!contentType) return [
                                    3,
                                    22
                                ];
                                if (!contentType.startsWith("text/html")) return [
                                    3,
                                    16
                                ];
                                _2 = (_1 = self.__eclipse$rewrite).html;
                                return [
                                    4,
                                    response.text()
                                ];
                            case 15:
                                body = _2.apply(_1, [
                                    _state.sent(),
                                    request.url
                                ]);
                                return [
                                    3,
                                    21
                                ];
                            case 16:
                                if (!contentType.startsWith("text/css")) return [
                                    3,
                                    18
                                ];
                                _4 = (_3 = self.__eclipse$rewrite).css;
                                return [
                                    4,
                                    response.text()
                                ];
                            case 17:
                                body = _4.apply(_3, [
                                    _state.sent(),
                                    "stylesheet",
                                    request.url
                                ]);
                                return [
                                    3,
                                    21
                                ];
                            case 18:
                                if (!(contentType.startsWith("text/javascript") || contentType.startsWith("application/javascript"))) return [
                                    3,
                                    20
                                ];
                                _6 = (_5 = self.__eclipse$rewrite).javascript;
                                return [
                                    4,
                                    response.text()
                                ];
                            case 19:
                                body = _6.apply(_5, [
                                    _state.sent(),
                                    request.url
                                ]);
                                return [
                                    3,
                                    21
                                ];
                            case 20:
                                body = response.body;
                                _state.label = 21;
                            case 21:
                                return [
                                    3,
                                    23
                                ];
                            case 22:
                                body = response.body;
                                _state.label = 23;
                            case 23:
                                return [
                                    3,
                                    40
                                ];
                            case 24:
                                _8 = (_7 = self.__eclipse$rewrite).javascript;
                                return [
                                    4,
                                    response.text()
                                ];
                            case 25:
                                body = _8.apply(_7, [
                                    _state.sent(),
                                    request.url
                                ]);
                                return [
                                    3,
                                    40
                                ];
                            case 26:
                                _10 = (_9 = self.__eclipse$rewrite).css;
                                return [
                                    4,
                                    response.text()
                                ];
                            case 27:
                                body = _10.apply(_9, [
                                    _state.sent(),
                                    "stylesheet",
                                    request.url
                                ]);
                                return [
                                    3,
                                    40
                                ];
                            case 28:
                                _12 = (_11 = self.__eclipse$rewrite).manifest;
                                return [
                                    4,
                                    response.json()
                                ];
                            case 29:
                                body = _12.apply(_11, [
                                    _state.sent(),
                                    request.url
                                ]);
                                return [
                                    3,
                                    40
                                ];
                            case 30:
                                if (!contentType) return [
                                    3,
                                    38
                                ];
                                if (!contentType.startsWith("text/html")) return [
                                    3,
                                    32
                                ];
                                _14 = (_13 = self.__eclipse$rewrite).html;
                                return [
                                    4,
                                    response.text()
                                ];
                            case 31:
                                body = _14.apply(_13, [
                                    _state.sent(),
                                    request.url
                                ]);
                                return [
                                    3,
                                    37
                                ];
                            case 32:
                                if (!contentType.startsWith("text/css")) return [
                                    3,
                                    34
                                ];
                                _16 = (_15 = self.__eclipse$rewrite).css;
                                return [
                                    4,
                                    response.text()
                                ];
                            case 33:
                                body = _16.apply(_15, [
                                    _state.sent(),
                                    "stylesheet",
                                    request.url
                                ]);
                                return [
                                    3,
                                    37
                                ];
                            case 34:
                                if (!(contentType.startsWith("text/javascript") || contentType.startsWith("application/javascript"))) return [
                                    3,
                                    36
                                ];
                                _18 = (_17 = self.__eclipse$rewrite).javascript;
                                return [
                                    4,
                                    response.text()
                                ];
                            case 35:
                                body = _18.apply(_17, [
                                    _state.sent(),
                                    request.url
                                ]);
                                return [
                                    3,
                                    37
                                ];
                            case 36:
                                body = response.body;
                                _state.label = 37;
                            case 37:
                                return [
                                    3,
                                    39
                                ];
                            case 38:
                                body = response.body;
                                _state.label = 39;
                            case 39:
                                return [
                                    3,
                                    40
                                ];
                            case 40:
                                if ([
                                    "document",
                                    "iframe"
                                ].includes(request.destination)) {
                                    contentDisposition = responseHeaders.get("content-disposition");
                                    if (!/\s*?((inline|attachment);\s*?)filename=/i.test(contentDisposition)) {
                                        type = /^\s*?attachment/i.test(contentDisposition) ? "attachment" : "inline";
                                        _response_finalURL_split_reverse = _sliced_to_array(response.finalURL.split("/").reverse(), 1), filename = _response_finalURL_split_reverse[0];
                                        responseHeaders.set("content-disposition", "".concat(type, "; filename=").concat(JSON.stringify(filename)));
                                    }
                                }
                                return [
                                    2,
                                    new Response(body, {
                                        headers: responseHeaders,
                                        status: response.status,
                                        statusText: response.statusText
                                    })
                                ];
                            case 41:
                                error = _state.sent();
                                return [
                                    2,
                                    new Response(error, {
                                        headers: {
                                            "content-type": "text/plain"
                                        },
                                        status: 500
                                    })
                                ];
                            case 42:
                                return [
                                    2
                                ];
                        }
                    });
                })();
            }
        }
    ]);
    return EclipseServiceWorker;
}();

})()
;
//# sourceMappingURL=eclipse.worker.js.map
