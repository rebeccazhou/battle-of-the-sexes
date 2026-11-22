// Answer suggestions for a category in the builder ("Rigatoni", "Farfalle"… for Pasta Shapes).
// Claude writes the list; it needs an ANTHROPIC_API_KEY secret (without one the function answers { source: "off" }).
// GET ?c=Pasta%20Shapes&have=Penne|Orzo  ->  { source, answers: [...] }
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

async function fromClaude(cat: string, have: string[]): Promise<string[]> {
  const client = new Anthropic();   // reads ANTHROPIC_API_KEY
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content:
      `We're playing a party picture-naming game: a photo appears on a projector and the player has 60 seconds to say what each one is.\n` +
      `Suggest 30 answers for the category "${cat}". Each answer must be something a single photo can clearly show, ` +
      `known by name to most adults at a Thanksgiving party, with a mix of easy and harder ones. Use the short name a player would say out loud.\n` +
      (have.length ? `Skip these, they're already in the category: ${have.join(", ")}.\n` : "") +
      `Reply with one answer per line and nothing else: no numbering, bullets or commentary.` }],
  });
  if (response.stop_reason === "refusal") return [];
  const text = response.content.map((b: any) => b.type === "text" ? b.text : "").join("\n");
  return text.split("\n").map(l => l.replace(/^[\s\-*•\d.)]+/, "").trim()).filter(l => l && l.length <= 60);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sp = new URL(req.url).searchParams;
  const cat = (sp.get("c") || "").trim().slice(0, 60);
  const have = (sp.get("have") || "").split("|").map(s => s.trim()).filter(Boolean).slice(0, 80);
  if (!cat) return Response.json({ source: "none", answers: [] }, { headers: CORS });
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return Response.json({ source: "off", answers: [] }, { headers: CORS });
  let list: string[] = [], source = "claude";
  try { list = await fromClaude(cat, have); } catch { source = "error"; }
  const seen = new Set(have.map(norm)), answers: string[] = [];
  for (const a of list) { const k = norm(a); if (k && !seen.has(k)) { seen.add(k); answers.push(a); } }
  return Response.json({ source, answers: answers.slice(0, 40) }, { headers: CORS });
});
