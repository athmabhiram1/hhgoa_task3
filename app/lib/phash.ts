export function hamming(a: string, b: string): number {
  if (a.length !== b.length) throw new Error("phash length mismatch");
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

export function phashHexToBin(hex: string): string {
  const clean = hex.replace(/^0x/, "");
  return BigInt("0x" + clean).toString(2).padStart(hex.length * 4, "0");
}

export function verdict(hd: number): "VERY_SIMILAR" | "SOMEWHAT" | "DIFFERENT" {
  if (hd <= 5) return "VERY_SIMILAR";
  if (hd <= 15) return "SOMEWHAT";
  return "DIFFERENT";
}
