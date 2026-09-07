export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!file) return Response.json({ error: "file field missing" }, { status: 400 });
  const out = new FormData();
  out.append("file", file);
  const r = await fetch(`${BACKEND}/detect`, { method: "POST", body: out });
  const j = await r.json().catch(() => ({}));
  return Response.json(j, { status: r.status });
}
