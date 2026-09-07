import { manifestForAnchor } from "../lib/canonical";

export type Candidate = {
  id: string;
  title: string;
  url: string;
  host: string;
  imageUrl: string;
  provider: string;
  source: string;
  isSocial: boolean;
};

export type Notice = { kind: "info" | "success" | "error"; text: string } | null;
export type WorkflowState = "idle" | "analyzing" | "sources" | "anchoring" | "sealed" | "verifying" | "verified" | "tampered";
export type Manifest = ReturnType<typeof manifestForAnchor>;
export type AnchorReceipt = { txHash: string; blockNumber: number; digest: string; manifest: Manifest };
export type Verification = { kind: "verified" | "tampered"; expected: string; computed: string; onChainUrl: string; checkedAt: string };

const SOCIAL_HOSTS = ["instagram.com", "x.com", "twitter.com", "facebook.com", "reddit.com", "tiktok.com", "threads.com"];

function getHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "unknown source"; }
}

function isSocialUrl(url: string): boolean {
  const host = getHost(url).toLowerCase();
  return SOCIAL_HOSTS.some((socialHost) => host === socialHost || host.endsWith(`.${socialHost}`));
}

export function toCandidate(item: Record<string, unknown>, index: number, provider: string): Candidate | null {
  const url = String(item.link ?? item.url ?? "");
  if (!url) return null;
  return {
    id: `${provider}-${index}-${url}`,
    title: String(item.title ?? item.pageTitle ?? url),
    url,
    host: getHost(url),
    imageUrl: String(item.thumbnail ?? item.image ?? ""),
    provider,
    source: String(item.source ?? getHost(url)),
    isSocial: Boolean(item._is_social) || isSocialUrl(url),
  };
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The request failed for an unknown reason.";
}

export async function readJson(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json().catch(() => ({}));
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (!response.ok) throw new Error(String(payload.error ?? `Request failed (${response.status})`));
  return payload;
}

export function shorten(value: string, start = 10, end = 8): string {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

export function navigateTo(section: string): void { document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }); }

export async function nextFileToDataUrl(file: File): Promise<string> { return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read the image for Vision fallback.")); reader.readAsDataURL(file); }); }

export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name.replace(/\.[a-z0-9]+$/i, "") + "-face.jpg", { type: blob.type || "image/jpeg" });
}
