// Stock photo search for the picture finder: Pexels + Pixabay.
// The API keys live in Supabase Edge Function secrets (PEXELS_API_KEY, PIXABAY_API_KEY), never in the web page.
// GET ?q=hair%20spray  ->  { pexels: [url...], pixabay: [url...] }   (a missing key just returns an empty list)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function getJson(url: string, headers: Record<string, string> = {}) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 5000);
  try { const r = await fetch(url, { headers, signal: c.signal }); return r.ok ? await r.json() : null; }
  catch { return null; } finally { clearTimeout(t); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 100);
  if (!q) return Response.json({ pexels: [], pixabay: [] }, { headers: CORS });
  const pexKey = Deno.env.get("PEXELS_API_KEY"), pixKey = Deno.env.get("PIXABAY_API_KEY");
  const [pex, pix] = await Promise.all([
    pexKey ? getJson(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=8`, { Authorization: pexKey }) : null,
    pixKey ? getJson(`https://pixabay.com/api/?key=${pixKey}&q=${encodeURIComponent(q)}&image_type=photo&safesearch=true&per_page=8`) : null,
  ]);
  return Response.json({
    pexels: (pex?.photos || []).map((p: any) => p.src?.large).filter(Boolean),
    pixabay: (pix?.hits || []).map((h: any) => h.webformatURL).filter(Boolean),
  }, { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } });
});
