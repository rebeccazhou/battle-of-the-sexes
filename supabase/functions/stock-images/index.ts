// Stock photo search for the picture finder: Pexels + Pixabay.
// The API keys live in Supabase Edge Function secrets (PEXELS_API_KEY, PIXABAY_API_KEY), never in the web page.
// GET ?q=hair%20spray&c=Beauty%20Grooming  ->  { pexels: [url...], pixabay: [url...] }   (a missing key just returns an empty list)
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
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 100), c = (sp.get("c") || "").trim().slice(0, 60);
  if (!q) return Response.json({ pexels: [], pixabay: [] }, { headers: CORS });
  const pexKey = Deno.env.get("PEXELS_API_KEY"), pixKey = Deno.env.get("PIXABAY_API_KEY");
  // Pixabay matches words loosely ("hair spray" finds spray-paint graffiti), so also search with the category words
  // and put those first; Pixabay requires every word, so a category search that finds nothing just falls back to the plain one
  const pixabay = (term: string) => pixKey ? getJson(`https://pixabay.com/api/?key=${pixKey}&q=${encodeURIComponent(term)}&image_type=photo&safesearch=true&per_page=8`) : null;
  const [pex, pixCat, pix] = await Promise.all([
    pexKey ? getJson(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=8`, { Authorization: pexKey }) : null,
    c ? pixabay(`${q} ${c}`.slice(0, 100)) : null,
    pixabay(q),
  ]);
  const pixUrls = [...(pixCat?.hits || []), ...(pix?.hits || [])].map((h: any) => h.webformatURL).filter(Boolean);
  return Response.json({
    pexels: (pex?.photos || []).map((p: any) => p.src?.large).filter(Boolean),
    pixabay: [...new Set(pixUrls)].slice(0, 10),
  }, { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } });
});
