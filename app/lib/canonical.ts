export function jcs(obj: unknown): string {
  return canonicalize(obj);
}

function canonicalize(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
  if (typeof v === "object") {
    // JS default sort compares UTF-16 code units, which is exactly RFC 8785 order.
    const keys = Object.keys(v as Record<string, unknown>).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize((v as Record<string, unknown>)[k])).join(",") + "}";
  }
  const s = JSON.stringify(v);
  if (typeof s !== "string") throw new Error("non-serializable manifest value");
  return s;
}

export function manifestForAnchor(args: {
  url: string;
  imageShaHex?: string;
  phashHex: string;
  phashBin: string;
  searchId: string;
  platform: string;
  retrievedAt: string;
}): Record<string, unknown> {
  return {
    canon_version: "canon_v1",
    url: args.url,
    imageShaHex: args.imageShaHex ?? "",
    phash: args.phashBin,
    phash_hex: args.phashHex,
    search_id: args.searchId,
    platform: args.platform,
    retrieved_at: args.retrievedAt,
  };
}
