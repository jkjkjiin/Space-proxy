# workerware
> A simple express-style middleware layer for service workers.

This repo should have compatability with all major browsers and javascript engines that support [Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

## But why?

Currently, Worker threads are not very extensible, unless they are extended manually by the site's developers. This allows for the plugins to be loaded from an external source (i.e IndexedDB), and have it parsed and act as functional middleware.

## Usage

workerware is simplistic by design. You just need to import the main library with `importScripts`
```js
importScripts("/path/to/workerware.js");
```

Then you can instantiate a new instance of workerware with the `new` keyword.
```js
// Default options, these don't need to be provided on instantiation.
const ww = new WorkerWare({
  debug: false,
  randomNames: false,
  timing: false
});
```

And finally, you can load a middleware by either importing a script, or loading a compliant function string from a separate source, and calling `new Function()` on the string.
```js
ww.use({
  // Required
  function: self.adblockExt.filterRequest,
  // Required, can take in multiple events!
  events: ["fetch"],
  // Optional, defaults to function.prototype.name, or is set to a random string if randomNames is set to true.
  name: "Adblock",
  // Optional configuration that can be accessed by the middleware under event.workerware.config
  configuration: {
    foo: "bar"
  }
});
```

**Notes:**
- The `name` property will be automatically set to either the passed in value, `function.prototype.name`, or a random UUID. All depending on the options and passed in values.
- The `function` property needs to be a function _reference_, for example, `self.adblockExt.filterRequest()` will likely NOT properly work, as this will pass in the return value of the function, not the function itself.

A valid list of Worker events can be found [here](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope)

Middlewares can also be deleted by event type or name, by doing the following.

```js
// Duplicate names should not exist, but if they do then every middleware by the passed in name will be deleted.
ww.deleteByName("Adblock");
```
or
```js
// WARNING: This will unregister EVERY middleware for this event type.
ww.deleteByEvent("fetch");
```

This library is still being actively maintained, with features being frequently added. If you have an interesting feature idea, feel free to open an issue about it.
