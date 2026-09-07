export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ponytail: single file proxy — hide SERPAPI_KEY, propagate search_id as genuine-call proof
// ponytail: uses FormData image_id flow (SerpApi /image → image_id → google_lens) — no public URL needed for local file

export async function POST(req: Request) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return Response.json({ error: "SerpApi Lens is not configured. Add SERPAPI_KEY to run a real search.", _provider: "serpapi_lens" }, { status: 503 });
  }

  let file: File | null = null;
  try {
    const fd = await req.formData();
    file = fd.get("file") as File | null;
  } catch {
    return Response.json({ error: "multipart file required" }, { status: 400 });
  }
  if (!file) return Response.json({ error: "file field missing" }, { status: 400 });
  if (file.size > 500 * 1024) {
    return Response.json({ error: "SerpApi /image max 500KB — crop tighter" }, { status: 413 });
  }
  if (file.size < 1024) return Response.json({ error: "too small" }, { status: 400 });

  try {
    // Step 1: upload to SerpApi Image API → image_id (valid 10 min)
    const imgFd = new FormData();
    imgFd.append("image", file, file.name);
    imgFd.append("api_key", apiKey);
    const upRes = await fetch("https://serpapi.com/image", { method: "POST", body: imgFd });
    const upJson: any = await upRes.json().catch(() => ({}));
    const imageId: string | undefined = upJson.image_id;
    if (!imageId) {
      return Response.json({ error: upJson.error || "SerpApi image upload failed", _provider: "serpapi_lens" }, { status: 502 });
    }

    // Step 2: Lens search via image_id
    const params = new URLSearchParams({
      engine: "google_lens",
      image_id: imageId,
      api_key: apiKey,
    });
    const lensRes = await fetch(`https://serpapi.com/search?${params.toString()}`);
    const lensJson: any = await lensRes.json();

    const searchId: string | null = lensJson.search_metadata?.id ?? null;
    const visual: any[] = lensJson.visual_matches ?? [];
    // ponytail: propagate search_id header for UI copy + README proof
    const headers: Record<string, string> = {};
    if (searchId) headers["x-search-id"] = searchId;

    // social filter is done client-side for flexibility, but we tag each entry with social flag for convenience
    const socialHosts = ["instagram.com", "x.com", "twitter.com", "facebook.com", "reddit.com", "tiktok.com"];
    const tagged = visual.slice(0, 8).map((v: any) => ({
      ...v,
      _is_social: socialHosts.some((h) => String(v.link ?? v.source ?? "").toLowerCase().includes(h)),
    }));

    return Response.json(
      {
        search_id: searchId,
        search_metadata: lensJson.search_metadata,
        visual_matches: tagged,
        pages_with_matching_images: lensJson.pages_with_matching_images ?? [],
        pagesWithMatchingImages: lensJson.pages_with_matching_images ?? [],
        _provider: "serpapi_lens",
      },
      { headers }
    );
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "SerpApi Lens request failed", _provider: "serpapi_lens" }, { status: 502 });
  }
}
