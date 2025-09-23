import dotenv from "dotenv";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import wisp from "wisp-server-node";
import { join } from "node:path";
import { access } from "node:fs/promises";
import { createServer, ServerResponse } from "node:http";
import { createBareServer } from "@tomphttp/bare-server-node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
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
[
  { root: join(import.meta.dirname, "dist"), prefix: "/", decorateReply: true },
  { root: epoxyPath, prefix: "/epoxy/" },
  { root: baremuxPath, prefix: "/baremux/" },
  { root: bareModulePath, prefix: "/baremod/" },
  { root: join(import.meta.dirname, "dist/uv"), prefix: "/_dist_uv/" },
  { root: uvPath, prefix: "/_uv/" }
].forEach(r => app.register(fastifyStatic, { ...r, decorateReply: r.decorateReply||false }));

app.get("/uv/*", async (req, reply) =>
  reply.sendFile(req.params["*"], await access(join(import.meta.dirname,"dist/uv",req.params["*"]))
    .then(()=>join(import.meta.dirname,"dist/uv")).catch(()=>uvPath))
);

if (process.env.MASQR === "true")
  app.addHook("onRequest", MasqrMiddleware);

const proxy = (url, type="application/javascript") => async (req, reply) => {
  try {
    const res = await fetch(url(req)); if (!res.ok) return reply.code(res.status).send();
    if (res.headers.get("content-type")) reply.type(res.headers.get("content-type")); else reply.type(type);
    return reply.send(Buffer.from(await res.arrayBuffer()));
  } catch { return reply.code(500).send(); }
};

app.get("/assets/img/*", proxy(req => `https://dogeub-assets.pages.dev/img/${req.params["*"]}`, ""));
app.get("/js/script.js", proxy(()=> "https://byod.privatedns.org/js/script.js"));

app.get("/return", async (req, reply) =>
  req.query?.q
    ? fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(req.query.q)}`)
        .then(r => r.json()).catch(()=>reply.code(500).send({error:"request failed"}))
    : reply.code(401).send({ error: "query parameter?" })
);

app.setNotFoundHandler((req, reply) =>
  req.raw.method==="GET" && req.headers.accept?.includes("text/html")
    ? reply.sendFile("index.html")
    : reply.code(404).send({ error: "Not Found" })
);

app.listen({ port }).then(()=>console.log(`Server running on ${port}`));
