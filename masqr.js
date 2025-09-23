import fs from "fs"
import path from "path"
import fetch from "node-fetch"

export const LICENSE_SERVER_URL = "http://localhost:8004/validate?license="
export const whiteListedDomains = []
export const failure = fs.readFileSync("Checkfailed.html", "utf8")
export const placeholder = fs.readFileSync("placeholder.svg", "utf8")

export async function MasqFail(req, reply) {
  if (!req.headers.host) return

  const unsafeSuffix = req.headers.host + ".html"
  const safeSuffix = path.normalize(unsafeSuffix).replace(/^(\.\.(\/|\\|$))+/, "")
  const safeJoin = path.join(process.cwd(), "Masqrd", safeSuffix)

  try {
    await fs.promises.access(safeJoin)
    const bruh = await fs.promises.readFile(safeJoin, "utf8")
    reply.header("Content-Type", "text/html").send(bruh)
  } catch {
    reply.header("Content-Type", "text/html").send(failure)
  }
}

export async function MasqrMiddleware(req, reply) {
  if (req.headers.host && whiteListedDomains.includes(req.headers.host)) return

  if (req.url.includes("placeholder.svg")) {
    reply.header("Content-Type", "image/svg+xml").send(placeholder)
    return
  }

  const authHeader = req.headers.authorization

  if (req.cookies?.auth) return

  if (req.cookies?.refreshcheck !== "true") {
    reply.setCookie("refreshcheck", "true", { maxAge: 10, path: "/" })
    await MasqFail(req, reply)
    return
  }

  if (!authHeader) {
    reply.header("WWW-Authenticate", "Basic").status(401)
    await MasqFail(req, reply)
    return
  }

  const [user, pass] = Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":")

  try {
    const licenseRes = await fetch(`${LICENSE_SERVER_URL}${pass}&host=${req.headers.host}`)
    const licenseData = await licenseRes.json()
    console.log(`${LICENSE_SERVER_URL}${pass}&host=${req.headers.host} returned`, licenseData)

    if (licenseData.status === "License valid") {
      reply.setCookie("auth", "true", {
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        path: "/",
      })
      reply.header("Content-Type", "text/html").send("<script>window.location.href = window.location.href</script>")
      return
    }
  } catch {}

  await MasqFail(req, reply)
}
