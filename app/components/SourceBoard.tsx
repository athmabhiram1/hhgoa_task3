"use client";

import { ReactElement, useState } from "react";
import { Check, Copy } from "lucide-react";
import { shorten, type Candidate, type WorkflowState } from "./shared";

type Filter = "ALL" | "SOCIAL" | "WEB";

function providerTone(provider: string): string {
  if (/lens/i.test(provider)) return "provider-chip--lens";
  if (/vision/i.test(provider)) return "provider-chip--vision";
  return "provider-chip--none";
}

export function SourceBoard({ candidates, selectedId, searchId, provider, workflow, selectionLocked, onSelect }: { candidates: Candidate[]; selectedId: string; searchId: string; provider: string; workflow: WorkflowState; selectionLocked: boolean; onSelect: (id: string) => void }): ReactElement {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [copied, setCopied] = useState(false);
  const socialCount = candidates.filter((c) => c.isSocial).length;
  const webCount = candidates.length - socialCount;
  const visible = candidates.filter((c) => filter === "ALL" || (filter === "SOCIAL" ? c.isSocial : !c.isSocial));
  async function copySearchId(): Promise<void> {
    if (!searchId) return;
    try { await navigator.clipboard.writeText(searchId); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  }
  return <article className="evidence-card source-card" id="sources">
    <div className="card-heading"><div><div className="card-kicker"><span>02 / DISCOVERY</span></div><h2>Indexed sources</h2></div><span className={`provider-chip ${providerTone(provider)}`}>{provider || "NO PROVIDER"}</span></div>
    <div className="source-meta"><span>SEARCH ID</span><b>{searchId ? shorten(searchId, 12, 8) : "—"}</b><button className={`source-copy-btn${copied ? " copied" : ""}`} disabled={!searchId} onClick={copySearchId}>{copied ? <Check size={10} /> : <Copy size={10} />}{copied ? "COPIED" : "COPY"}</button><span className="source-count">{candidates.length ? `${candidates.length} results` : "No results"}</span></div>
    <div className="q-chip source-query"><span className="dot verm pulse" />QUERY <b>{searchId ? shorten(searchId, 10, 6) : "—"}</b><span className="source-query-domain">· DOMAIN SET: SOCIAL + WEB</span></div>
    <div className="pills source-pills">
      <button className={`pill${filter === "ALL" ? " on" : ""}`} onClick={() => setFilter("ALL")}>ALL<i>{candidates.length}</i></button>
      <button className={`pill${filter === "SOCIAL" ? " on" : ""}`} onClick={() => setFilter("SOCIAL")}>SOCIAL<i>{socialCount}</i></button>
      <button className={`pill${filter === "WEB" ? " on" : ""}`} onClick={() => setFilter("WEB")}>WEB<i>{webCount}</i></button>
    </div>
    {workflow === "analyzing" && <div className="source-state"><span className="spinner" /> Querying the configured web provider…</div>}
    {!candidates.length && workflow !== "analyzing" && <div className="source-empty"><b>No source cards yet.</b><span>Run a live analysis to populate this board. If a provider is unavailable, the error will be shown instead of inventing a match.</span></div>}
    <div className="source-list">{visible.map((candidate, index) => <button className={`source-row ${selectedId === candidate.id ? "selected" : ""}`} key={candidate.id} disabled={selectionLocked} onClick={() => onSelect(candidate.id)}>
      {candidate.imageUrl ? <img src={candidate.imageUrl} alt="" /> : <span className="source-thumb">↗</span>}
      <span className="source-copy"><small>{String(index + 1).padStart(2, "0")} · {candidate.source}</small><b>{candidate.title}</b><em>{candidate.url}</em></span>
      <span className={`source-tag ${candidate.isSocial ? "social" : "web"}`}>{candidate.isSocial ? "SOCIAL" : "WEB"}</span>
      <span className="source-select">{selectedId === candidate.id ? "SELECTED" : "SELECT"}</span>
    </button>)}</div>
    {visible.length === 0 && candidates.length > 0 && workflow !== "analyzing" && <div className="source-filter-empty"><span>No {filter === "SOCIAL" ? "social" : "web"} sources in this result set.</span><button onClick={() => setFilter("ALL")}>SHOW ALL</button></div>}
  </article>;
}
