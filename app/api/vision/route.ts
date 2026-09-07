export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ponytail: Vision Web Detection fallback — 1k free/mo + $300 credit, no domain filter (post-filter social)
// ponytail: mirrors /api/lens shape: { search_id, pagesWithMatchingImages, visuallySimilar } so frontend swaps providers with one flag

export async function POST(req: Request) {
  const keyJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // if neither cred present → instruct, don't crash
  if (!keyJson && !keyPath) {
    return Response.json(
      {
        error: "Vision fallback not configured — set GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS",
        pagesWithMatchingImages: [],
        visuallySimilarImages: [],
        _provider: "vision",
      },
      { status: 503 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON { imageBase64: data:image/jpeg;base64,... } required" }, { status: 400 });
  }
  const b64: string | undefined = body.imageBase64;
  if (!b64 || typeof b64 !== "string" || b64.length < 100) {
    return Response.json({ error: "imageBase64 missing/too short" }, { status: 400 });
  }
  // strip data URL prefix if present
  const clean = b64.includes(",") ? b64.split(",").pop()! : b64;

  try {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    let visionRes: any;

    if (apiKey) {
      visionRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{ image: { content: clean }, features: [{ type: "WEB_DETECTION", maxResults: 10 }] }],
        }),
      }).then((r) => r.json());
    } else if (keyJson || keyPath) {
      // service-account JSON via google-auth-library — uses project-6d0a199b from gcp-key.json
      const { GoogleAuth } = await import("google-auth-library");
      const auth = new GoogleAuth(
        keyJson
          ? { credentials: JSON.parse(keyJson), scopes: ["https://www.googleapis.com/auth/cloud-vision"] }
          : { keyFile: keyPath, scopes: ["https://www.googleapis.com/auth/cloud-vision"] }
      );
      const client = await auth.getClient();
      const token = await client.getAccessToken();
      const accessToken = typeof token === "string" ? token : (token as any)?.token;
      if (!accessToken) throw new Error("Vision JWT failed — check gcp-key.json and Vision API enabled");
      visionRes = await fetch("https://vision.googleapis.com/v1/images:annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          requests: [{ image: { content: clean }, features: [{ type: "WEB_DETECTION", maxResults: 10 }] }],
        }),
      }).then((r) => r.json());
      if (visionRes?.error) throw new Error(visionRes.error.message || JSON.stringify(visionRes.error));
    } else {
      return Response.json(
        {
          error: "Vision needs GOOGLE_CLOUD_VISION_API_KEY or service-account JSON",
          pagesWithMatchingImages: [],
          _provider: "vision",
        },
        { status: 501 }
      );
    }

    const web = visionRes?.responses?.[0]?.webDetection;
    const pages = web?.pagesWithMatchingImages ?? [];
    const similar = web?.visuallySimilarImages ?? [];
    const searchId = `vision_${Date.now()}`;

    // post-filter social — Vision has no domain filter per Google docs July 2025
    const social = ["instagram.com", "x.com", "twitter.com", "facebook.com", "reddit.com"];
    const taggedPages = pages.slice(0, 8).map((p: any) => ({ ...p, _is_social: social.some((h) => String(p.url ?? "").includes(h)) }));
    const taggedSimilar = similar.slice(0, 8).map((p: any) => ({ ...p, _is_social: social.some((h) => String(p.url ?? "").includes(h)) }));

    return Response.json(
      {
        search_id: searchId,
        search_metadata: { id: searchId, status: "Success (vision)" },
        pagesWithMatchingImages: taggedPages,
        visuallySimilarImages: taggedSimilar,
        webEntities: web?.webEntities ?? [],
        _provider: "vision",
      },
      { headers: { "x-search-id": searchId } }
    );
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Vision request failed", _provider: "vision" }, { status: 502 });
  }
}
