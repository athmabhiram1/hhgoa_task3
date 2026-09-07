export interface SyntheticRisk {
  score: number | null; // 0-100 or null if not evaluated
  label: "REAL" | "FAKE" | "UNKNOWN";
  explain: string;
  source: string;
}

export interface SyntheticRiskProvider {
  score(image: Uint8Array): Promise<SyntheticRisk>;
}

export class NullProvider implements SyntheticRiskProvider {
  async score(_: Uint8Array): Promise<SyntheticRisk> {
    return {
      score: null,
      label: "UNKNOWN",
      explain: "Synthetic check deferred — reuse evidence is deterministic; synthetic probe is probabilistic and pluggable later (UncovAIProvider/HFViT).",
      source: "null",
    };
  }
}

// ponytail: upgrade path — no dep now, add later in 1 line:
// export class UncovAIProvider implements SyntheticRiskProvider { async score(b){ const r=await fetch("https://..."); return {...} } }
