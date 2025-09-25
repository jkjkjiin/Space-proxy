import dotenv from "dotenv";
import Fastify from "fastify";
import { Curl } from 'node-libcurl';
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
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

await app.register(fastifyCookie);
await app.register(fastifyRateLimit, {
  max: 100, // limit each IP to 100 requests per windowMs
  timeWindow: "15 minutes", // 15 minute window
});
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
  try {
    const res = await fetch(url(req));
    if (!res.ok) return reply.code(res.status).send();

    // Remove or modify problematic headers
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
    ];
    for (const [key, value] of res.headers.entries()) {
      if (!headersToStrip.includes(key.toLowerCase())) {
        reply.header(key, value);
      }
    }

    reply.type(res.headers.get("content-type") || type);
    // Stream the response body for large payloads
    return reply.send(res.body);
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
