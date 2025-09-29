import dotenv from "dotenv";
import fastifyHelmet from "@fastify/helmet";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import wisp from "wisp-server-node";
import { join } from "node:path";
import { access } from "node:fs/promises";
import { createServer, ServerResponse } from "node:http";
import { createBareServer } from "@tomphttp/bare-server-node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from '@mercuryworkshop/libcurl-transport';
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { bareModulePath } from "@mercuryworkshop/bare-as-module3";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { MasqrMiddleware } from "./masqr.js";

dotenv.config();
// Enforce HTTPS (redirect HTTP to HTTPS)
ServerResponse.prototype.setMaxListeners(50);
ServerResponse.prototype.setMaxListeners(50);

const port = 2345, server = createServer(), bare = createBareServer("/seal/");
server.on("upgrade", (req, sock, head) =>
  bare.shouldRoute(req) ? bare.routeUpgrade(req, sock, head)
  : req.url.endsWith("/wisp/") ? wisp.routeRequest(req, sock, head)
  : sock.end()
);
const app = Fastify({
  serverFactory: h => (server.on("request", (req,res) =>
    bare.shouldRoute(req) ? bare.routeRequest(req,res) : h(req,res)), server),
  logger: false

});

// Enforce HTTPS (redirect HTTP to HTTPS)
if (process.env.FORCE_HTTPS === "true") {
  app.addHook("onRequest", async (req, reply) => {
    if (req.headers["x-forwarded-proto"] === "http") {
      reply.redirect(`https://${req.headers.host}${req.raw.url}`);
    }
  });
}

// Secure headers
await app.register(fastifyHelmet, {
  contentSecurityPolicy: false,
});

await app.register(fastifyCookie);

[
  { root: join(import.meta.dirname, "public"), prefix: "/", decorateReply: true },
  { root: libcurlPath, prefix: "/libcurl/" },,
  { root: epoxyPath, prefix: "/epoxy/" },
  { root: baremuxPath, prefix: "/baremux/" },
  { root: bareModulePath, prefix: "/baremod/" },
  { root: join(import.meta.dirname, "public/js"), prefix: "/_dist_uv/" },
  { root: uvPath, prefix: "/_uv/" }
].forEach(r => app.register(fastifyStatic, { ...r, decorateReply: r.decorateReply||false }));

app.get("/uv/*", async (req, reply) =>
  reply.sendFile(req.params["*"], await access(join(import.meta.dirname,"dist/uv",req.params["*"]))
    .then(()=>join(import.meta.dirname,"dist/uv")).catch(()=>uvPath))
);

if (process.env.MASQR === "true")
  app.addHook("onRequest", MasqrMiddleware);


const proxy = (url, type = "application/javascript") => async (req, reply) => {
    // Block known tracking domains
    const trackingDomains = [
  'trk.pinterest.com', 'widgets.pinterest.com', 'events.reddit.com', 'events.redditmedia.com',
  'ads.youtube.com', 'ads-api.tiktok.com', 'analytics.tiktok.com', 'ads-sg.tiktok.com', 
  'business-api.tiktok.com', 'ads.tiktok.com', 'log.byteoversea.com', 'ads.yahoo.com',
  'analytics.yahoo.com', 'geo.yahoo.com', 'udc.yahoo.com', 'udcm.yahoo.com', 'advertising.yahoo.com',
  'analytics.query.yahoo.com', 'partnerads.ysm.yahoo.com', 'log.fc.yahoo.com', 'gemini.yahoo.com', 
  'extmaps-api.yandex.net', 'analytics-sg.tiktok.com', 'adtech.yahooinc.com', 'adfstat.yandex.ru',
  'appmetrica.yandex.ru', 'metrika.yandex.ru', 'advertising.yandex.ru', 'offerwall.yandex.net',
  'adfox.yandex.ru', 'auction.unityads.unity3d.com', 'webview.unityads.unity3d.com','config.unityads.unity3d.com',
  'bdapi-ads.realmemobile.com', 'bdapi-in-ads.realmemobile.com', 'api.ad.xiaomi.com', 'data.mistat.xiaomi.com',
  'data.mistat.india.xiaomi.com', 'data.mistat.rus.xiaomi.com', 'sdkconfig.ad.xiaomi.com', 'sdkconfig.ad.intl.xiaomi.com',
  'globalapi.ad.xiaomi.com', 'tracking.rus.miui.com', 'adsfs.oppomobile.com', 'adx.ads.oppomobile.com',
  'ck.ads.oppomobile.com', 'data.ads.oppomobile.com', 'metrics.data.hicloud.com', 'metrics2.data.hicloud.com',
  'grs.hicloud.com', 'logservice.hicloud.com', 'logservice1.hicloud.com', 'logbak.hicloud.com',
  'click.oneplus.cn', 'open.oneplus.net', 'samsungads.com', 'smetrics.samsung.com', 
  'analytics-api.samsunghealthcn.com', 'samsung-com.112.2o7.net', 'nmetrics.samsung.com', 
  'advertising.apple.com', 'tr.iadsdk.apple.com', 'iadsdk.apple.com', 'metrics.icloud.com',
  'metrics.apple.com', 'metrics.mzstatic.com', 'api-adservices.apple.com', 'books-analytics-events.apple.com',
  'weather-analytics-events.apple.com', 'notes-analytics-events.apple.com', 'fwtracks.freshmarketer.com', 'adtago.s3.amazonaws.com',
  'analytics.s3.amazonaws.com', 'advice-ads.s3.amazonaws.com', 'advertising-api-eu.amazon.com', 'pagead2.googlesyndication.com',
  'adservice.google.com', 'afs.googlesyndication.com', 'mediavisor.doubleclick.net', 'ads30.adcolony.com',
  'adc3-launch.adcolony.com', 'events3alt.adcolony.com', 'wd.adcolony.com', 'adservetx.media.net',
  'analytics.google.com', 'app-measurement.com', 'click.googleanalytics.com', 'identify.hotjar.com',
  'events.hotjar.io', 'o2.mouseflow.com', 'gtm.mouseflow.com', 'api.mouseflow.com','realtime.luckyorange.com',
  'upload.luckyorange.net', 'cs.luckyorange.net', 'an.facebook.com', 'static.ads-twitter.com',
  'adserver.unityads.unity3d.com', 'iot-eu-logser.realme.com', 'iot-logser.realme.com', 'ads-api.twitter.com',
  'adroll.com', 'hotjar.com', 'mixpanel.com', 'adjust.com', 'amazon-adsystem.com',
  'kochava.com', 'sentry.io', 'cloudflareinsights.com', 'appsflyer.com', 
  'ad.doubleclick.net', 'google-analytics.com',  'bluekai.com',  'onelink.me',
  'static.doubleclick.net/instream/ad status.js',
    ];
    const targetUrl = url(req);
    if (trackingDomains.some(domain => targetUrl.includes(domain))) {
      return reply.code(403).send('Blocked tracking domain');
    }

    // Remove cookies from request
    req.headers.cookie = '';

    // Inject Do Not Track header
    req.headers['dnt'] = '1';
  try {
    // Simple in-memory cache for GET requests
    const cache = proxy.cache || (proxy.cache = new Map());
    const cacheKey = req.method === 'GET' ? url(req) : null;
    if (cacheKey && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      reply.headers(cached.headers);
      reply.type(cached.type);
      return reply.send(cached.body);
    }

    const res = await fetch(url(req));
    if (!res.ok) return reply.code(res.status).send();

    // Remove or modify problematic headers and tracking headers
    const headersToStrip = [
      'content-security-policy',
      'content-security-policy-report-only',
      'x-frame-options',
      'x-content-type-options',
      'cross-origin-embedder-policy',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy',
      'strict-transport-security',
      'set-cookie',
      'server',
      'x-powered-by',
      'x-ua-compatible',
      'x-forwarded-for',
      'x-real-ip',
      'referer',
      'user-agent',
    ];
    let responseHeaders = {};
    for (const [key, value] of res.headers.entries()) {
      if (!headersToStrip.includes(key.toLowerCase())) {
        reply.header(key, value);
        responseHeaders[key] = value;
      }
    }
  // Harden cookies
  reply.header('Set-Cookie', 'Secure; HttpOnly; SameSite=Strict');

    // Enable compression if supported
    const acceptEncoding = req.headers['accept-encoding'] || '';
    let body = await res.arrayBuffer();
    let typeHeader = res.headers.get("content-type") || type;
    reply.type(typeHeader);
    if (acceptEncoding.includes('br')) {
      // Brotli compression
      const zlib = await import('zlib');
      body = zlib.brotliCompressSync(Buffer.from(body));
      reply.header('Content-Encoding', 'br');
    } else if (acceptEncoding.includes('gzip')) {
      // Gzip compression
      const zlib = await import('zlib');
      body = zlib.gzipSync(Buffer.from(body));
      reply.header('Content-Encoding', 'gzip');
    }

    // Cache GET responses
    if (cacheKey) {
      cache.set(cacheKey, {
        headers: responseHeaders,
        type: typeHeader,
        body,
      });
    }
    return reply.send(body);
  } catch (err) {
    console.error("Proxy error:", err);
    return reply.code(500).send();
  }
};

app.get("//*", proxy(req => `${req.params["*"]}`, ""));
app.get("/js/script.js", proxy(()=> "https://byod.privatedns.org/js/script.js"));

app.get("/return", async (req, reply) =>
  req.query?.q
    ? fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(req.query.q)}`)
        .then(r => r.json()).catch(()=>reply.code(500).send({error:"request failed"}))
    : reply.code(401).send({ error: "query parameter?" })
);

app.setNotFoundHandler((req, reply) =>
  req.raw.method==="GET" && req.headers.accept?.includes("text/html")
  ? reply.sendFile("err.html")
    : reply.code(404).send({ error: "Not Found" })
);
// Custom routes for HTML pages (migrated from Express routes.js)
app.get("/", async (req, reply) => {
  return reply.sendFile("index.html");
});

app.get("/&", async (req, reply) => {
  return reply.sendFile("&.html");
});

app.get("/~", async (req, reply) => {
  return reply.sendFile("~.html");
});

app.get("/g", async (req, reply) => {
  return reply.sendFile("g.html");
});

app.get("/a", async (req, reply) => {
  return reply.sendFile("a.html");
});

app.get("/err", async (req, reply) => {
  return reply.sendFile("err.html");
});

app.get("/500", async (req, reply) => {
  return reply.sendFile("500.html");
});

app.get("/password", async (req, reply) => {
  return reply.sendFile("password.html");
});

app.listen({ port }).then(()=>console.log(`Server running on ${port}`));
