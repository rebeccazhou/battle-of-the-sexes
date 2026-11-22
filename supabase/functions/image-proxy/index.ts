// Fetches a picture from another website so the builder can edit it (blur logos) or keep its own copy.
// Browsers won't let a page edit pictures from most other sites; this returns the same bytes with CORS allowed.
// GET ?u=https://example.com/photo.jpg  ->  the image (images only, 10 MB max)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const fail = (status: number, msg: string) => new Response(msg, { status, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let target: URL;
  try { target = new URL(new URL(req.url).searchParams.get("u") || ""); } catch { return fail(400, "bad url"); }
  // public https websites only: no IP addresses, no local names
  const host = target.hostname;
  if (target.protocol !== "https:" || /^[\d.]+$/.test(host) || host.includes(":") || !host.includes(".") || /(^|\.)(localhost|local|internal)$/i.test(host))
    return fail(400, "not allowed");
  const c = new AbortController(), t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(target, { signal: c.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (party picture game)", Accept: "image/*" } });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) return fail(415, "not an image");
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 10 * 1024 * 1024) return fail(413, "too big");
    return new Response(buf, { headers: { ...CORS, "Content-Type": type, "Cache-Control": "public, max-age=86400" } });
  } catch { return fail(502, "couldn't fetch"); } finally { clearTimeout(t); }
});
