import dotenv from "dotenv";
import fastifyHelmet from "@fastify/helmet";
import Fastify from "fastify";
import { Curl } from 'node-libcurl';
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
      'google-analytics.com', 'doubleclick.net', 'facebook.com', 'adservice.google.com',
      'ads.yahoo.com', 'scorecardresearch.com', 'quantserve.com', 'adnxs.com',
      'mathtag.com', 'bluekai.com', 'criteo.com', 'openx.net', 'rubiconproject.com',
      'adroll.com', 'taboola.com', 'outbrain.com', 'bing.com', 'yandex.ru',
      'hotjar.com', 'mixpanel.com', 'optimizely.com', 'segment.com', 'appsflyer.com',
      'branch.io', 'adjust.com', 'kochava.com', 'sentry.io', 'cloudflareinsights.com'
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
