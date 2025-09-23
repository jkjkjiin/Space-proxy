(() => { // webpackBootstrap
var __webpack_modules__ = ({
"./node_modules/set-cookie-parser/lib/set-cookie.js": (function (module) {
"use strict";


var defaultParseOptions = {
  decodeValues: true,
  map: false,
  silent: false,
};

function isNonEmptyString(str) {
  return typeof str === "string" && !!str.trim();
}

function parseString(setCookieValue, options) {
  var parts = setCookieValue.split(";").filter(isNonEmptyString);

  var nameValuePairStr = parts.shift();
  var parsed = parseNameValuePair(nameValuePairStr);
  var name = parsed.name;
  var value = parsed.value;

  options = options
    ? Object.assign({}, defaultParseOptions, options)
    : defaultParseOptions;

  try {
    value = options.decodeValues ? decodeURIComponent(value) : value; // decode cookie value
  } catch (e) {
    console.error(
      "set-cookie-parser encountered an error while decoding a cookie with value '" +
        value +
        "'. Set options.decodeValues to false to disable this feature.",
      e
    );
  }

  var cookie = {
    name: name,
    value: value,
  };

  parts.forEach(function (part) {
    var sides = part.split("=");
    var key = sides.shift().trimLeft().toLowerCase();
    var value = sides.join("=");
    if (key === "expires") {
      cookie.expires = new Date(value);
    } else if (key === "max-age") {
      cookie.maxAge = parseInt(value, 10);
    } else if (key === "secure") {
      cookie.secure = true;
    } else if (key === "httponly") {
      cookie.httpOnly = true;
    } else if (key === "samesite") {
      cookie.sameSite = value;
    } else if (key === "partitioned") {
      cookie.partitioned = true;
    } else {
      cookie[key] = value;
    }
  });

  return cookie;
}

function parseNameValuePair(nameValuePairStr) {
  // Parses name-value-pair according to rfc6265bis draft

  var name = "";
  var value = "";
  var nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("="); // everything after the first =, joined by a "=" if there was more than one part
  } else {
    value = nameValuePairStr;
  }

  return { name: name, value: value };
}

function parse(input, options) {
  options = options
    ? Object.assign({}, defaultParseOptions, options)
    : defaultParseOptions;

  if (!input) {
    if (!options.map) {
      return [];
    } else {
      return {};
    }
  }

  if (input.headers) {
    if (typeof input.headers.getSetCookie === "function") {
      // for fetch responses - they combine headers of the same type in the headers array,
      // but getSetCookie returns an uncombined array
      input = input.headers.getSetCookie();
    } else if (input.headers["set-cookie"]) {
      // fast-path for node.js (which automatically normalizes header names to lower-case
      input = input.headers["set-cookie"];
    } else {
      // slow-path for other environments - see #25
      var sch =
        input.headers[
          Object.keys(input.headers).find(function (key) {
            return key.toLowerCase() === "set-cookie";
          })
        ];
      // warn if called on a request-like object with a cookie header rather than a set-cookie header - see #34, 36
      if (!sch && input.headers.cookie && !options.silent) {
        console.warn(
          "Warning: set-cookie-parser appears to have been called on a request object. It is designed to parse Set-Cookie headers from responses, not Cookie headers from requests. Set the option {silent: true} to suppress this warning."
        );
      }
      input = sch;
    }
  }
  if (!Array.isArray(input)) {
    input = [input];
  }

  if (!options.map) {
    return input.filter(isNonEmptyString).map(function (str) {
      return parseString(str, options);
    });
  } else {
    var cookies = {};
    return input.filter(isNonEmptyString).reduce(function (cookies, str) {
      var cookie = parseString(str, options);
      cookies[cookie.name] = cookie;
      return cookies;
    }, cookies);
  }
}

/*
  Set-Cookie header field-values are sometimes comma joined in one string. This splits them without choking on commas
  that are within a single set-cookie field-value, such as in the Expires portion.

  This is uncommon, but explicitly allowed - see https://tools.ietf.org/html/rfc2616#section-4.2
  Node.js does this for every header *except* set-cookie - see https://github.com/nodejs/node/blob/d5e363b77ebaf1caf67cd7528224b651c86815c1/lib/_http_incoming.js#L128
  React Native's fetch does this for *every* header, including set-cookie.

  Based on: https://github.com/google/j2objc/commit/16820fdbc8f76ca0c33472810ce0cb03d20efe25
  Credits to: https://github.com/tomball for original and https://github.com/chrusart for JavaScript implementation
*/
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString;
  }
  if (typeof cookiesString !== "string") {
    return [];
  }

  var cookiesStrings = [];
  var pos = 0;
  var start;
  var ch;
  var lastComma;
  var nextStart;
  var cookiesSeparatorFound;

  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }

  function notSpecialChar() {
    ch = cookiesString.charAt(pos);

    return ch !== "=" && ch !== ";" && ch !== ",";
  }

  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;

    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        // ',' is a cookie separator if we have later first '=', not ';' or ','
        lastComma = pos;
        pos += 1;

        skipWhitespace();
        nextStart = pos;

        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }

        // currently special character
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          // we found cookies separator
          cookiesSeparatorFound = true;
          // pos is inside the next cookie, so back up and return it.
          pos = nextStart;
          cookiesStrings.push(cookiesString.substring(start, lastComma));
          start = pos;
        } else {
          // in param ',' or param separator ';',
          // we continue from that comma
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }

    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
    }
  }

  return cookiesStrings;
}

module.exports = parse;
module.exports.parse = parse;
module.exports.parseString = parseString;
module.exports.splitCookiesString = splitCookiesString;


}),
"./src/client/api/addeventlistener.ts": (function () {
function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
}
function _array_without_holes(arr) {
    if (Array.isArray(arr)) return _array_like_to_array(arr);
}
function _iterable_to_array(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _non_iterable_rest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _non_iterable_spread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _to_array(arr) {
    return _array_with_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_rest();
}
function _to_consumable_array(arr) {
    return _array_without_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_spread();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
window.addEventListener = new Proxy(window.addEventListener, {
    apply: function apply(target, thisArg, param) {
        var _param = _to_array(param), type = _param[0], func = _param[1], argArray = _param.slice(2);
        if ([
            "message",
            "messageerror"
        ].includes(type)) {
            var wrappedFunc = function wrappedFunc(event) {
                Object.defineProperty(event, "origin", {
                    value: new URL(self.__eclipse$rewrite.url.decode(window.location.href)).origin
                });
                return func.call(this, event);
            };
            return Reflect.apply(target, thisArg, [
                type,
                wrappedFunc
            ].concat(_to_consumable_array(argArray)));
        } else if (type == "hashchange") {
            var wrappedFunc1 = function wrappedFunc(event) {
                Object.defineProperty(event, "newURL", {
                    value: self.__eclipse$rewrite.url.decode(event.newURL)
                });
                Object.defineProperty(event, "oldURL", {
                    value: self.__eclipse$rewrite.url.decode(event.oldURL)
                });
                return func.call(this, event);
            };
            return Reflect.apply(target, thisArg, [
                type,
                wrappedFunc1
            ].concat(_to_consumable_array(argArray)));
        }
        return Reflect.apply(target, thisArg, [
            type,
            func
        ].concat(_to_consumable_array(argArray)));
    }
});


}),
"./src/client/api/audio.ts": (function () {
window.Audio = new Proxy(window.Audio, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[0]) {
            argArray[0] = self.__eclipse$rewrite.url.encode(argArray[0], window.location.href);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});


}),
"./src/client/api/cookie.ts": (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* ESM import */var set_cookie_parser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! set-cookie-parser */ "./node_modules/set-cookie-parser/lib/set-cookie.js");
/* ESM import */var set_cookie_parser__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(set_cookie_parser__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _webreflection_idb_map__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @webreflection/idb-map */ "./node_modules/@webreflection/idb-map/index.js");
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


var originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
Object.defineProperty(window.document, "cookie", {
    get: function get() {
        return originalCookieDescriptor.get.call(window.document);
    },
    set: function set(cookie) {
        return _async_to_generator(function() {
            var cookiesJar, cookies, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, _$cookie, err, proxiedCookie;
            return _ts_generator(this, function(_state) {
                switch(_state.label){
                    case 0:
                        cookiesJar = new _webreflection_idb_map__WEBPACK_IMPORTED_MODULE_0__["default"](new URL(self.__eclipse$rewrite.url.decode(window.location.href)).host, {
                            durability: "relaxed",
                            prefix: "@eclipse/cookies"
                        });
                        cookies = (0,set_cookie_parser__WEBPACK_IMPORTED_MODULE_1__.parse)(cookie, {
                            silent: true
                        });
                        _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                        _state.label = 1;
                    case 1:
                        _state.trys.push([
                            1,
                            6,
                            7,
                            8
                        ]);
                        _iterator = cookies[Symbol.iterator]();
                        _state.label = 2;
                    case 2:
                        if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                            3,
                            5
                        ];
                        _$cookie = _step.value;
                        return [
                            4,
                            cookiesJar.set(_$cookie.name, _$cookie)
                        ];
                    case 3:
                        _state.sent();
                        _state.label = 4;
                    case 4:
                        _iteratorNormalCompletion = true;
                        return [
                            3,
                            2
                        ];
                    case 5:
                        return [
                            3,
                            8
                        ];
                    case 6:
                        err = _state.sent();
                        _didIteratorError = true;
                        _iteratorError = err;
                        return [
                            3,
                            8
                        ];
                    case 7:
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
                    case 8:
                        proxiedCookie = cookie;
                        originalCookieDescriptor.set.call(document, proxiedCookie);
                        return [
                            2
                        ];
                }
            });
        })();
    }
});


}),
"./src/client/api/document.ts": (function () {
window.document.open = new Proxy(window.document.open, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray.length === 3) {
            return window.open(self.__eclipse$rewrite.url.encode(argArray[0], window.location.href));
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});
Object.defineProperty(window.document, "domain", {
    get: function get() {
        return new URL(self.__eclipse$rewrite.url.decode(window.location.href)).host;
    },
    set: function set(value) {
        return value;
    }
});
var originalDocumentbaseURI = window.document.baseURI;
Object.defineProperty(window.document, "baseURI", {
    get: function get() {
        return self.__eclipse$rewrite.url.decode(originalDocumentbaseURI);
    },
    set: function set(value) {
        return value;
    }
});
var originalDocumentdocumentURI = window.document.documentURI;
Object.defineProperty(window.document, "documentURI", {
    get: function get() {
        return self.__eclipse$rewrite.url.decode(originalDocumentdocumentURI);
    },
    set: function set(value) {
        return value;
    }
});
var originalDocumentreferrer = window.document.referrer;
Object.defineProperty(window.document, "referrer", {
    get: function get() {
        return originalDocumentreferrer ? self.__eclipse$rewrite.url.decode(originalDocumentreferrer) : originalDocumentreferrer;
    },
    set: function set(value) {
        return value;
    }
});
var originalDocumentURL = window.document.URL;
Object.defineProperty(window.document, "URL", {
    get: function get() {
        return self.__eclipse$rewrite.url.decode(originalDocumentURL);
    },
    set: function set(value) {
        return value;
    }
});
window.document.write = new Proxy(window.document.write, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[0]) {
            argArray[0] = self.__eclipse$rewrite.html(argArray[0], window.location.href, true);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});
window.document.writeln = new Proxy(window.document.writeln, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[0]) {
            argArray[0] = self.__eclipse$rewrite.html(argArray[0], window.location.href, true);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});


}),
"./src/client/api/element.ts": (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* ESM import */var _document_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../document.ts */ "./src/client/document.ts");
/* ESM import */var _window_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../window.ts */ "./src/client/window.ts");
function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_without_holes(arr) {
    if (Array.isArray(arr)) return _array_like_to_array(arr);
}
function _instanceof(left, right) {
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function _iterable_to_array(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _non_iterable_spread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _to_consumable_array(arr) {
    return _array_without_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_spread();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}


var htmlElements = new Set([
    "HTMLElement",
    "HTMLAnchorElement",
    "HTMLAreaElement",
    "HTMLAudioElement",
    "HTMLBaseElement",
    "HTMLBodyElement",
    "HTMLBRElement",
    "HTMLButtonElement",
    "HTMLCanvasElement",
    "HTMLDataElement",
    "HTMLDataListElement",
    "HTMLDialogElement",
    "HTMLDivElement",
    "HTMLDListElement",
    "HTMLEmbedElement",
    "HTMLFieldSetElement",
    "HTMLFontElement",
    "HTMLFormElement",
    "HTMLFrameElement",
    "HTMLFrameSetElement",
    "HTMLHeadingElement",
    "HTMLHeadElement",
    "HTMLHRElement",
    "HTMLHtmlElement",
    "HTMLIFrameElement",
    "HTMLImageElement",
    "HTMLInputElement",
    "HTMLLabelElement",
    "HTMLLegendElement",
    "HTMLLIElement",
    "HTMLLinkElement",
    "HTMLMapElement",
    "HTMLMarqueeElement",
    "HTMLMediaElement",
    "HTMLMenuElement",
    "HTMLMetaElement",
    "HTMLMeterElement",
    "HTMLModElement",
    "HTMLObjectElement",
    "HTMLOListElement",
    "HTMLOptGroupElement",
    "HTMLOptionElement",
    "HTMLOutputElement",
    "HTMLParagraphElement",
    "HTMLParamElement",
    "HTMLPictureElement",
    "HTMLPreElement",
    "HTMLProgressElement",
    "HTMLQuoteElement",
    "HTMLScriptElement",
    "HTMLSelectElement",
    "HTMLSlotElement",
    "HTMLSourceElement",
    "HTMLSpanElement",
    "HTMLStyleElement",
    "HTMLTableCaptionElement",
    "HTMLTableCellElement",
    "HTMLTableColElement",
    "HTMLTableElement",
    "HTMLTableRowElement",
    "HTMLTableSectionElement",
    "HTMLTemplateElement",
    "HTMLTextAreaElement",
    "HTMLTimeElement",
    "HTMLTitleElement",
    "HTMLTrackElement",
    "HTMLUListElement",
    "HTMLUnknownElement",
    "HTMLVideoElement"
]);
var urlAttributes = new Set([
    "href",
    "src",
    "action",
    "formaction",
    "ping",
    "profile",
    "movie",
    "poster",
    "background",
    "data"
]);
var deleteAttributes = new Set([
    "http-equiv",
    "nonce",
    "integrity",
    "crossorigin",
    "sandbox",
    "csp"
]);
var srcSetAttributes = new Set([
    "srcset",
    "imagesrcset"
]);
var htmlAttributes = new Set([
    "srcdoc"
]);
var cssAttributes = new Set([
    "style"
]);
var javascriptAttributes = new Set([
    "onafterprint",
    "onbeforeprint",
    "onbeforeunload",
    "onerror",
    "onhashchange",
    "onload",
    "onmessage",
    "onoffline",
    "ononline",
    "onpagehide",
    "onpopstate",
    "onstorage",
    "onunload",
    "onblur",
    "onchange",
    "oncontextmenu",
    "onfocus",
    "oninput",
    "oninvalid",
    "onreset",
    "onsearch",
    "onselect",
    "onsubmit",
    "onkeydown",
    "onkeypress",
    "onkeyup",
    "onclick",
    "ondblclick",
    "onmousedown",
    "onmousemove",
    "onmouseout",
    "onmouseover",
    "onmouseup",
    "onmousewheel",
    "onwheel",
    "ondrag",
    "ondragend",
    "ondragenter",
    "ondragleave",
    "ondragover",
    "ondragstart",
    "ondrop",
    "onscroll",
    "oncopy",
    "oncut",
    "onpaste",
    "onabort",
    "oncanplay",
    "oncanplaythrough",
    "oncuechange",
    "ondurationchange",
    "onemptied",
    "onended",
    "onerror",
    "onloadeddata",
    "onloadedmetadata",
    "onloadstart",
    "onpause",
    "onplay",
    "onplaying",
    "onprogress",
    "onratechange",
    "onseeked",
    "onseeking",
    "onstalled",
    "onsuspend",
    "ontimeupdate",
    "onvolumechange",
    "onwaiting"
]);
var allAttributes = new Set(_to_consumable_array(urlAttributes).concat(_to_consumable_array(deleteAttributes), _to_consumable_array(srcSetAttributes), _to_consumable_array(htmlAttributes), _to_consumable_array(javascriptAttributes)));
Object.defineProperty(Node.prototype, "baseURI", {
    get: function get() {
        return window.document.baseURI;
    }
});
var originalElementInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
Object.defineProperty(Element.prototype, "innerHTML", {
    set: function set(value) {
        if (_instanceof(this, HTMLScriptElement)) {
            originalElementInnerHTML.set.call(this, self.__eclipse$rewrite.javascript(value, window.location.href));
        } else if (_instanceof(this, HTMLStyleElement)) {
            originalElementInnerHTML.set.call(this, self.__eclipse$rewrite.css(value, "stylesheet", window.location.href));
        } else {
            originalElementInnerHTML.set.call(this, self.__eclipse$rewrite.html(value, window.location.href, true));
        }
        return value;
    },
    get: function get() {
        return originalElementInnerHTML.get.call(this);
    }
});
var originalElementInnerText = Object.getOwnPropertyDescriptor(Element.prototype, "innerText");
Object.defineProperty(Element.prototype, "innerText", {
    set: function set(value) {
        if (_instanceof(this, HTMLScriptElement)) {
            originalElementInnerText.set.call(this, self.__eclipse$rewrite.javascript(value, window.location.href));
        } else if (_instanceof(this, HTMLStyleElement)) {
            originalElementInnerText.set.call(this, self.__eclipse$rewrite.css(value, "stylesheet", window.location.href));
        } else {
            originalElementInnerText.set.call(this, value);
        }
        return value;
    },
    get: function get() {
        return originalElementInnerText.get.call(this);
    }
});
var originalElementHasAttribute = HTMLElement.prototype.hasAttribute;
Object.defineProperty(Element.prototype, "hasAttribute", {
    value: function value(attribute) {
        if (attribute.startsWith("data-eclipse-attr-")) {
            return null;
        } else {
            return originalElementHasAttribute.call(this, attribute);
        }
    }
});
var originalElementGetAttribute = HTMLElement.prototype.getAttribute;
Object.defineProperty(Element.prototype, "getAttribute", {
    value: function value(attribute) {
        if (attribute.startsWith("data-eclipse-attr-")) {
            return null;
        } else if (originalElementHasAttribute.call(this, "data-eclipse-attr-".concat(attribute))) {
            return originalElementGetAttribute.call(this, "data-eclipse-attr-".concat(attribute));
        } else {
            return originalElementGetAttribute.call(this, attribute);
        }
    }
});
var originalElementSetAttribute = HTMLElement.prototype.setAttribute;
Object.defineProperty(Element.prototype, "setAttribute", {
    value: function value(name, value) {
        if (urlAttributes.has(name)) {
            originalElementSetAttribute.call(this, "data-eclipse-attr-".concat(name), value);
            return originalElementSetAttribute.call(this, name, value ? self.__eclipse$rewrite.url.encode(value, window.location.href) : "");
        } else if (deleteAttributes.has(name)) {
            return originalElementSetAttribute.call(this, "data-eclipse-attr-".concat(name), value);
        } else if (srcSetAttributes.has(name)) {
            originalElementSetAttribute.call(this, "data-eclipse-attr-".concat(name), value);
            return originalElementSetAttribute.call(this, name, value ? self.__eclipse$rewrite.srcset(value, window.location.href) : "");
        } else if (htmlAttributes.has(name)) {
            originalElementSetAttribute.call(this, "data-eclipse-attr-".concat(name), value);
            return originalElementSetAttribute.call(this, name, value ? self.__eclipse$rewrite.html(value, window.location.href) : "");
        } else if (cssAttributes.has(name)) {
            originalElementSetAttribute.call(this, "data-eclipse-attr-".concat(name), value);
            return originalElementSetAttribute.call(this, name, value ? self.__eclipse$rewrite.css(value, "declarationList", window.location.href) : "");
        } else if (javascriptAttributes.has(name)) {
            originalElementSetAttribute.call(this, "data-eclipse-attr-".concat(name), value);
            return originalElementSetAttribute.call(this, name, value ? self.__eclipse$rewrite.javascript(value, window.location.href) : "");
        } else {
            return originalElementSetAttribute.call(this, name, value);
        }
    }
});
var originalElementRemoveAttribute = HTMLElement.prototype.removeAttribute;
Object.defineProperty(Element.prototype, "removeAttribute", {
    value: function value(attribute) {
        if (originalElementHasAttribute.call(this, "data-eclipse-attr-".concat(attribute))) {
            originalElementRemoveAttribute.call(this, "data-eclipse-attr-".concat(attribute));
        }
        return originalElementRemoveAttribute.call(this, attribute);
    }
});
var originalElementGetAttributeNames = HTMLElement.prototype.getAttributeNames;
Object.defineProperty(Element.prototype, "getAttributeNames", {
    value: function value() {
        var attributes = originalElementGetAttributeNames.call(this).filter(function(attr) {
            return !attr.startsWith("data-eclipse-attr");
        });
        return attributes;
    }
});
var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
try {
    for(var _iterator = htmlElements[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
        var htmlElement = _step.value;
        if (window.hasOwnProperty(htmlElement)) {
            var _iteratorNormalCompletion1 = true, _didIteratorError1 = false, _iteratorError1 = undefined;
            try {
                var _loop = function() {
                    var attribute = _step1.value;
                    if (window[htmlElement].prototype.hasOwnProperty(attribute)) {
                        Object.defineProperty(window[htmlElement].prototype, attribute, {
                            set: function set(value) {
                                return this.setAttribute(attribute, value);
                            },
                            get: function get() {
                                return this.getAttribute(attribute);
                            }
                        });
                    }
                };
                for(var _iterator1 = allAttributes[Symbol.iterator](), _step1; !(_iteratorNormalCompletion1 = (_step1 = _iterator1.next()).done); _iteratorNormalCompletion1 = true)_loop();
            } catch (err) {
                _didIteratorError1 = true;
                _iteratorError1 = err;
            } finally{
                try {
                    if (!_iteratorNormalCompletion1 && _iterator1.return != null) {
                        _iterator1.return();
                    }
                } finally{
                    if (_didIteratorError1) {
                        throw _iteratorError1;
                    }
                }
            }
        }
    }
} catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
} finally{
    try {
        if (!_iteratorNormalCompletion && _iterator.return != null) {
            _iterator.return();
        }
    } finally{
        if (_didIteratorError) {
            throw _iteratorError;
        }
    }
}
//getAttributeNS getAttributeNode getAttributeNodeNS setAttributeNS setAttributeNode setAttributeNodeNS outerHTML outerText insertAdjacentHTML insertAdjacentText
//HTMLAnchorElement.prototype.origin (document.querySelector("a").origin) (also other url properties like pathname etc.)
var originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "contentWindow").get;
Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
    get: function get() {
        return (0,_window_ts__WEBPACK_IMPORTED_MODULE_1__.createWindowProxy)(originalContentWindow.call(this));
    }
});
var originalContentDocument = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "contentDocument").get;
Object.defineProperty(HTMLIFrameElement.prototype, "contentDocument", {
    get: function get() {
        return (0,_document_ts__WEBPACK_IMPORTED_MODULE_0__.createDocumentProxy)(originalContentDocument.call(this));
    }
});


}),
"./src/client/api/eval.ts": (function () {
window.eval = new Proxy(window.eval, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[0]) {
            argArray[0] = self.__eclipse$rewrite.javascript(argArray[0], window.location.href);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});
window.Function = new Proxy(window.Function, {
    construct: function construct(target, argArray) {
        if (argArray[argArray.length - 1]) {
            argArray[argArray.length - 1] = self.__eclipse$rewrite.javascript(argArray[argArray.length - 1], window.location.href);
        }
        return Reflect.construct(target, argArray);
    }
});


}),
"./src/client/api/fetch.ts": (function () {
window.fetch = new Proxy(window.fetch, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[0]) {
            argArray[0] = self.__eclipse$rewrite.url.encode(argArray[0], window.location.href);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});


}),
"./src/client/api/history.ts": (function () {
window.history.pushState = new Proxy(window.history.pushState, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[2]) {
            argArray[2] = self.__eclipse$rewrite.url.encode(argArray[2], window.location.href);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});
window.history.replaceState = new Proxy(window.history.replaceState, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[2]) {
            argArray[2] = self.__eclipse$rewrite.url.encode(argArray[2], window.location.href);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});


}),
"./src/client/api/importscripts.ts": (function () {
if ("importScripts" in self) {
    self.importScripts = new Proxy(self.importScripts, {
        apply: function apply(target, thisArg, argArray) {
            if (argArray) {
                argArray = argArray.map(function(arg) {
                    return self.__eclipse$rewrite.url.encode(arg, self.location.href);
                });
            }
            return Reflect.apply(target, thisArg, argArray);
        }
    });
}


}),
"./src/client/api/navigator.ts": (function () {
function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
window.navigator.sendBeacon = new Proxy(window.navigator.sendBeacon, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[0]) {
            argArray[0] = self.__eclipse$rewrite.url.encode(argArray[0], window.location.href);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});
window.navigator.serviceWorker.register = new Proxy(window.navigator.serviceWorker.register, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[0]) {
            argArray[0] = self.__eclipse$rewrite.url.encode(argArray[0], window.location.href);
        }
        if (argArray[1]) {
            if (_type_of(argArray[1]) == "object" && !Array.isArray(argArray[1])) {
                if (argArray[1].scope) {
                    argArray[1].scope = self.__eclipse$rewrite.url.encode(argArray[1].scope, window.location.href);
                }
            }
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});


}),
"./src/client/api/open.ts": (function () {
window.open = new Proxy(window.open, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[0]) {
            argArray[0] = self.__eclipse$rewrite.url.encode(argArray[0], window.location.href);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});


}),
"./src/client/api/origin.ts": (function () {
Object.defineProperty(window, "origin", {
    get: function get() {
        return new URL(self.__eclipse$rewrite.url.decode(window.location.href)).origin;
    },
    set: function set(value) {
        return value;
    }
});


}),
"./src/client/api/performance.ts": (function () {
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
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _define_property(target, key, source[key]);
        });
    }
    return target;
}
function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _object_spread_props(target, source) {
    source = source != null ? source : {};
    if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
        ownKeys(Object(source)).forEach(function(key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
    }
    return target;
}
var originalGetEntriesByType = window.performance.getEntriesByType;
window.performance.getEntriesByType = function(type) {
    var entries = originalGetEntriesByType.call(this, type);
    if ([
        "navigation",
        "resource"
    ].includes(type)) {
        return entries.map(function(entry) {
            return _object_spread_props(_object_spread({}, entry), {
                name: self.__eclipse$rewrite.url.decode(entry.name)
            });
        });
    }
    return entries;
};


}),
"./src/client/api/postmessage.ts": (function () {
window.postMessage = new Proxy(window.postMessage, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[1]) {
            argArray[1] = self.__eclipse$rewrite.url.encode(argArray[0], window.location.href);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});


}),
"./src/client/api/style.ts": (function () {
var originalElementStyle = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "style");
Object.defineProperty(HTMLElement.prototype, "style", {
    get: function get() {
        var styles = originalElementStyle.get.call(this);
        return new Proxy(styles, {
            get: function get(target, property) {
                var value = target[property];
                if (typeof value == "function") {
                    return value.bind(target);
                }
                var urlRegex = /url\(["']?([^)"']+)["']?\)/;
                if (urlRegex.test(value)) {
                    return value.replace(urlRegex, function(match, url) {
                        return "url(".concat(self.__eclipse$rewrite.url.decode(url), ")");
                    });
                }
                return value;
            },
            set: function set(target, property, value) {
                var urlRegex = /url\(["']?([^)"']+)["']?\)/;
                if (urlRegex.test(value)) {
                    target[property] = value.replace(urlRegex, function(match, url) {
                        return "url(".concat(self.__eclipse$rewrite.url.encode(url, window.location.href), ")");
                    });
                    return true;
                }
                target[property] = value;
                return true;
            }
        });
    }
});
var originalGetProperty = CSSStyleDeclaration.prototype.getPropertyValue;
CSSStyleDeclaration.prototype.getPropertyValue = function(property) {
    var value = originalGetProperty.call(this, property);
    var urlRegex = /url\(["']?([^)"']+)["']?\)/;
    if (urlRegex.test(value)) {
        return value.replace(urlRegex, function(match, url) {
            return "url(".concat(self.__eclipse$rewrite.url.decode(url), ")");
        });
    }
    return value;
}; //setProperty
 //cssText


}),
"./src/client/api/websocket.ts": (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* ESM import */var _mercuryworkshop_bare_mux__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @mercuryworkshop/bare-mux */ "./node_modules/@mercuryworkshop/bare-mux/dist/index.mjs");

var client = new _mercuryworkshop_bare_mux__WEBPACK_IMPORTED_MODULE_0__.BareClient();
window.WebSocket = new Proxy(window.WebSocket, {
    construct: function construct(target, args) {
        return client.createWebSocket(args[0], args[1], target, {
            "User-Agent": navigator.userAgent
        }, ArrayBuffer.prototype);
    }
});


}),
"./src/client/api/worker.ts": (function () {
window.Worker = new Proxy(window.Worker, {
    construct: function construct(target, argArray) {
        if (argArray[0]) {
            argArray[0] = self.__eclipse$rewrite.url.encode(argArray[0], window.location.href);
        }
        return Reflect.construct(target, argArray);
    }
});
Worklet.prototype.addModule = new Proxy(Worklet.prototype.addModule, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[0]) {
            argArray[0] = self.__eclipse$rewrite.url.encode(argArray[0], window.location.href);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});


}),
"./src/client/api/xmlhttprequest.ts": (function () {
window.XMLHttpRequest.prototype.open = new Proxy(window.XMLHttpRequest.prototype.open, {
    apply: function apply(target, thisArg, argArray) {
        if (argArray[1]) {
            argArray[1] = self.__eclipse$rewrite.url.encode(argArray[1], window.location.href);
        }
        return Reflect.apply(target, thisArg, argArray);
    }
});


}),
"./src/client/document.ts": (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  createDocumentProxy: function() { return createDocumentProxy; }
});
/* ESM import */var _location_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./location.ts */ "./src/client/location.ts");
/* ESM import */var _window_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./window.ts */ "./src/client/window.ts");


function createDocumentProxy() {
    var doc = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : window.document;
    return new Proxy(doc, {
        get: function get(target, prop) {
            var value = target[prop];
            if (prop == "location") {
                return (0,_location_ts__WEBPACK_IMPORTED_MODULE_0__.createLocationProxy)(value);
            } else if (prop == "defaultView") {
                return (0,_window_ts__WEBPACK_IMPORTED_MODULE_1__.createWindowProxy)(value);
            }
            if (typeof value == "function") {
                return value.bind(target);
            } else {
                return value;
            }
        },
        set: function set(target, prop, newValue) {
            target[prop] = newValue;
            return true;
        }
    });
}



}),
"./src/client/location.ts": (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  createLocationProxy: function() { return createLocationProxy; }
});
function createLocationProxy() {
    var loc = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : window.location;
    return new Proxy({}, {
        get: function get(_target, prop) {
            var decodedLocation = new URL(self.__eclipse$rewrite.url.decode(loc.href));
            switch(prop){
                case "constructor":
                    return loc.constructor;
                case "assign":
                    return function(url) {
                        return loc.assign(self.self.__eclipse$rewrite.url.encode(url, window.location.href));
                    };
                case "reload":
                    return function() {
                        return loc.reload();
                    };
                case "replace":
                    return function(url) {
                        return loc.replace(self.__eclipse$rewrite.url.encode(url, window.location.href));
                    };
                case "toString":
                    return function() {
                        return decodedLocation.toString();
                    };
                default:
                    return decodedLocation[prop];
            }
        },
        set: function set(_target, prop, value) {
            var decodedLocation = new URL(self.__eclipse$rewrite.url.decode(loc.href));
            if (prop in decodedLocation) {
                decodedLocation[prop] = new URL(value, decodedLocation.href).toString();
                loc.href = self.__eclipse$rewrite.url.encode(decodedLocation.href, window.location.href);
                return true;
            }
            return false;
        }
    });
}



}),
"./src/client/scope.ts": (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* ESM import */var _window_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./window.ts */ "./src/client/window.ts");
/* ESM import */var _location_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./location.ts */ "./src/client/location.ts");
/* ESM import */var _document_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./document.ts */ "./src/client/document.ts");
function _instanceof(left, right) {
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}



function scope(identifier) {
    var globals = [
        "window",
        "self",
        "globalThis",
        "parent",
        "top",
        "document",
        "frames"
    ];
    if (globals.filter(function(global) {
        return window[global].Window ? _instanceof(identifier, window[global].Window) : false;
    }).length > 0) {
        return (0,_window_ts__WEBPACK_IMPORTED_MODULE_0__.createWindowProxy)(identifier);
    } else if (_instanceof(identifier, Location)) {
        return (0,_location_ts__WEBPACK_IMPORTED_MODULE_1__.createLocationProxy)(identifier);
    } else if (_instanceof(identifier, Document)) {
        return (0,_document_ts__WEBPACK_IMPORTED_MODULE_2__.createDocumentProxy)(identifier);
    }
    return identifier;
}
self.__eclipse$scope = new Proxy({}, {
    get: function get(_target, prop) {
        return scope(self[prop]);
    },
    //@ts-ignore
    set: function set(target, prop, newValue) {
        if (prop == "location") {
            //@ts-ignore
            return window.location = self.__eclipse$rewrite.url.encode(newValue, window.location.href);
        }
        target[prop] = newValue;
        return true;
    }
});


}),
"./src/client/window.ts": (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  createWindowProxy: function() { return createWindowProxy; }
});
/* ESM import */var _document_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./document.ts */ "./src/client/document.ts");
/* ESM import */var _location_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./location.ts */ "./src/client/location.ts");


function createWindowProxy() {
    var win = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : window;
    return new Proxy(win, {
        get: function get(target, prop) {
            var value = target[prop];
            if (prop == "location") {
                return (0,_location_ts__WEBPACK_IMPORTED_MODULE_1__.createLocationProxy)(value);
            } else if (prop == "document") {
                return (0,_document_ts__WEBPACK_IMPORTED_MODULE_0__.createDocumentProxy)(value);
            } else if ([
                "window",
                "self",
                "globalThis",
                "parent",
                "top",
                "frames"
            ].includes(prop)) {
                return createWindowProxy(value);
            }
            if (typeof value == "function") {
                return value.bind(target);
            } else {
                return value;
            }
        },
        //@ts-ignore
        set: function set(target, prop, newValue) {
            if (prop == "location") {
                return win.location = self.__eclipse$rewrite.url.encode(newValue, window.location.href);
            }
            target[prop] = newValue;
            return true;
        }
    });
}



}),
"./node_modules/@mercuryworkshop/bare-mux/dist/index.mjs": (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
"use strict";
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
"./node_modules/@webreflection/idb-map/index.js": (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
"use strict";
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  "default": function() { return IDBMap; }
});
const { assign } = Object;

const STORAGE = 'entries';
const READONLY = 'readonly';
const READWRITE = 'readwrite';

/**
 * @typedef {Object} IDBMapOptions
 * @prop {'strict' | 'relaxed' | 'default'} [durability]
 * @prop {string} [prefix]
 */

/** @typedef {[IDBValidKey, unknown]} IDBMapEntry */

/** @type {IDBMapOptions} */
const defaultOptions = { durability: 'default', prefix: 'IDBMap' };

/**
 * @template T
 * @param {{ target: IDBRequest<T> }} event
 * @returns {T}
 */
const result = ({ target: { result } }) => result;

class IDBMap extends EventTarget {
  // Privates
  /** @type {Promise<IDBDatabase>} */ #db;
  /** @type {IDBMapOptions} */ #options;
  /** @type {string} */ #prefix;

  /**
   * @template T
   * @param {(store: IDBObjectStore) => IDBRequest<T>} what
   * @param {'readonly' | 'readwrite'} how
   * @returns {Promise<T>}
   */
  async #transaction(what, how) {
    const db = await this.#db;
    const t = db.transaction(STORAGE, how, this.#options);
    return new Promise((onsuccess, onerror) => assign(
      what(t.objectStore(STORAGE)),
      {
        onsuccess,
        onerror,
      }
    ));
  }

  /**
   * @param {string} name
   * @param {IDBMapOptions} options
   */
  constructor(
    name,
    {
      durability = defaultOptions.durability,
      prefix = defaultOptions.prefix,
    } = defaultOptions
  ) {
    super();
    this.#prefix = prefix;
    this.#options = { durability };
    this.#db = new Promise((resolve, reject) => {
      assign(
        indexedDB.open(`${this.#prefix}/${name}`),
        {
          onupgradeneeded({ target: { result, transaction } }) {
            if (!result.objectStoreNames.length)
              result.createObjectStore(STORAGE);
            transaction.oncomplete = () => resolve(result);
          },
          onsuccess(event) {
            resolve(result(event));
          },
          onerror(event) {
            reject(event);
            this.dispatchEvent(event);
          },
        },
      );
    }).then(result => {
      const boundDispatch = this.dispatchEvent.bind(this);
      for (const key in result) {
        if (key.startsWith('on'))
          result[key] = boundDispatch;
      }
      return result;
    });
  }

  // EventTarget Forwards
  /**
   * @param {Event} event
   * @returns 
   */
  dispatchEvent(event) {
    const { type, message, isTrusted } = event;
    return super.dispatchEvent(
      // avoid re-dispatching of the same event
      isTrusted ?
        assign(new Event(type), { message }) :
        event
    );
  }

  // IDBDatabase Forwards
  async close() {
    (await this.#db).close();
  }

  // Map async API
  get size() {
    return this.#transaction(
      store => store.count(),
      READONLY,
    ).then(result);
  }

  async clear() {
    await this.#transaction(
      store => store.clear(),
      READWRITE,
    );
  }

  /**
   * @param {IDBValidKey} key
   */
  async delete(key) {
    await this.#transaction(
      store => store.delete(key),
      READWRITE,
    );
  }

  /**
   * @returns {Promise<IDBMapEntry[]>}
   */
  async entries() {
    const keys = await this.keys();
    return Promise.all(keys.map(key => this.get(key).then(value => [key, value])));
  }

  /**
   * @param {(unknown, IDBValidKey, IDBMap) => void} callback
   * @param {unknown} [context]
   */
  async forEach(callback, context = this) {
    for (const [key, value] of await this.entries())
      await callback.call(context, value, key, this);
  }

  /**
   * @param {IDBValidKey} key
   * @returns {Promise<unknown | undefined>}
   */
  async get(key) {
    const value = await this.#transaction(
      store => store.get(key),
      READONLY,
    ).then(result);
    return value;
  }

  /**
   * @param {IDBValidKey} key
   */
  async has(key) {
    const k = await this.#transaction(
      store => store.getKey(key),
      READONLY,
    ).then(result);
    return k !== void 0;
  }

  async keys() {
    const keys = await this.#transaction(
      store => store.getAllKeys(),
      READONLY,
    ).then(result);
    return keys;
  }

  /**
   * @param {IDBValidKey} key
   * @param {unknown} value
   */
  async set(key, value) {
    await this.#transaction(
      store => store.put(value, key),
      READWRITE,
    );
    return this;
  }

  async values() {
    const keys = await this.keys();
    return Promise.all(keys.map(key => this.get(key)));
  }

  get [Symbol.toStringTag]() {
    return this.#prefix;
  }
}


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
// webpack/runtime/compat_get_default_export
(() => {
// getDefaultExport function for compatibility with non-ESM modules
__webpack_require__.n = function (module) {
	var getter = module && module.__esModule ?
		function () { return module['default']; } :
		function () { return module; };
	__webpack_require__.d(getter, { a: getter });
	return getter;
};




})();
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
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* ESM import */var _scope_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./scope.ts */ "./src/client/scope.ts");
/* ESM import */var _api_eval_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./api/eval.ts */ "./src/client/api/eval.ts");
/* ESM import */var _api_eval_ts__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_api_eval_ts__WEBPACK_IMPORTED_MODULE_1__);
/* ESM import */var _api_fetch_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./api/fetch.ts */ "./src/client/api/fetch.ts");
/* ESM import */var _api_fetch_ts__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_api_fetch_ts__WEBPACK_IMPORTED_MODULE_2__);
/* ESM import */var _api_history_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./api/history.ts */ "./src/client/api/history.ts");
/* ESM import */var _api_history_ts__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_api_history_ts__WEBPACK_IMPORTED_MODULE_3__);
/* ESM import */var _api_websocket_ts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./api/websocket.ts */ "./src/client/api/websocket.ts");
/* ESM import */var _api_xmlhttprequest_ts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./api/xmlhttprequest.ts */ "./src/client/api/xmlhttprequest.ts");
/* ESM import */var _api_xmlhttprequest_ts__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_api_xmlhttprequest_ts__WEBPACK_IMPORTED_MODULE_5__);
/* ESM import */var _api_open_ts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./api/open.ts */ "./src/client/api/open.ts");
/* ESM import */var _api_open_ts__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_api_open_ts__WEBPACK_IMPORTED_MODULE_6__);
/* ESM import */var _api_postmessage_ts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./api/postmessage.ts */ "./src/client/api/postmessage.ts");
/* ESM import */var _api_postmessage_ts__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(_api_postmessage_ts__WEBPACK_IMPORTED_MODULE_7__);
/* ESM import */var _api_navigator_ts__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./api/navigator.ts */ "./src/client/api/navigator.ts");
/* ESM import */var _api_navigator_ts__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(_api_navigator_ts__WEBPACK_IMPORTED_MODULE_8__);
/* ESM import */var _api_document_ts__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./api/document.ts */ "./src/client/api/document.ts");
/* ESM import */var _api_document_ts__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(_api_document_ts__WEBPACK_IMPORTED_MODULE_9__);
/* ESM import */var _api_worker_ts__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./api/worker.ts */ "./src/client/api/worker.ts");
/* ESM import */var _api_worker_ts__WEBPACK_IMPORTED_MODULE_10___default = /*#__PURE__*/__webpack_require__.n(_api_worker_ts__WEBPACK_IMPORTED_MODULE_10__);
/* ESM import */var _api_importscripts_ts__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./api/importscripts.ts */ "./src/client/api/importscripts.ts");
/* ESM import */var _api_importscripts_ts__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(_api_importscripts_ts__WEBPACK_IMPORTED_MODULE_11__);
/* ESM import */var _api_element_ts__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./api/element.ts */ "./src/client/api/element.ts");
/* ESM import */var _api_style_ts__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./api/style.ts */ "./src/client/api/style.ts");
/* ESM import */var _api_style_ts__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(_api_style_ts__WEBPACK_IMPORTED_MODULE_13__);
/* ESM import */var _api_cookie_ts__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./api/cookie.ts */ "./src/client/api/cookie.ts");
/* ESM import */var _api_origin_ts__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./api/origin.ts */ "./src/client/api/origin.ts");
/* ESM import */var _api_origin_ts__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(_api_origin_ts__WEBPACK_IMPORTED_MODULE_15__);
/* ESM import */var _api_audio_ts__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./api/audio.ts */ "./src/client/api/audio.ts");
/* ESM import */var _api_audio_ts__WEBPACK_IMPORTED_MODULE_16___default = /*#__PURE__*/__webpack_require__.n(_api_audio_ts__WEBPACK_IMPORTED_MODULE_16__);
/* ESM import */var _api_performance_ts__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./api/performance.ts */ "./src/client/api/performance.ts");
/* ESM import */var _api_performance_ts__WEBPACK_IMPORTED_MODULE_17___default = /*#__PURE__*/__webpack_require__.n(_api_performance_ts__WEBPACK_IMPORTED_MODULE_17__);
/* ESM import */var _api_addeventlistener_ts__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./api/addeventlistener.ts */ "./src/client/api/addeventlistener.ts");
/* ESM import */var _api_addeventlistener_ts__WEBPACK_IMPORTED_MODULE_18___default = /*#__PURE__*/__webpack_require__.n(_api_addeventlistener_ts__WEBPACK_IMPORTED_MODULE_18__);




















})();

})()
;
//# sourceMappingURL=eclipse.client.js.map
