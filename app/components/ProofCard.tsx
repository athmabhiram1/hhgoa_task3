"use client";

import { ReactElement } from "react";
import { RotateCcw, ShieldCheck, Stamp, TriangleAlert } from "lucide-react";
import { shorten, type AnchorReceipt, type Candidate, type Verification, type WorkflowState } from "./shared";

export function ProofCard({ selected, phash, searchId, anchor, verification, workflow, busy, onAnchor, onVerify, onTamper, onResetTamper }: {
  selected: Candidate | null; phash: string; searchId: string; anchor: AnchorReceipt | null; verification: Verification | null; workflow: WorkflowState; busy: boolean;
  onAnchor: () => void; onVerify: () => void; onTamper: () => void; onResetTamper: () => void;
}): ReactElement {
  const isTampered = workflow === "tampered";
  return <article className={`evidence-card proof-card ${isTampered ? "tampered" : ""}`} id="proof">
    <div className="paper proof-cert">
    {anchor && <span className="filedstamp show">FILED<span>BLOCK {anchor.blockNumber}</span></span>}
    <div className={`proof-seal${anchor ? " show" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <defs><path id="sealcirc" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
        <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="36" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <text fontFamily="IBM Plex Mono,monospace" fontSize="8.5" letterSpacing="1.6" fill="currentColor"><textPath href="#sealcirc">VERIFIED · BLOCK {anchor?.blockNumber ?? "—"} · CHAIN 31337 · SYBILWATCH ·</textPath></text>
        <path d="M46 60 l10 10 l20 -20" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <div className="proof-form-head"><span>FORM 40-X · CERTIFICATE OF BIOMETRIC INTEGRITY</span><span>DOCKET / PROOF</span></div>
    <div className="card-kicker"><span>03 / PROOF</span><span className={`card-status ${anchor ? "sealed" : ""}`}>{anchor ? "SEALED" : "DRAFT"}</span></div>
    <h2>{anchor ? "Custody receipt" : "Make the evidence verifiable"}</h2>
    <p className="proof-intro">Only the source URL, search identifier, platform, and face fingerprint are committed. The original image buffer is not persisted on-chain.</p>
    <div className="manifest-list">
      <div><span>SELECTED SOURCE</span><b>{selected?.host ?? "Select a source first"}</b></div>
      <div><span>CONTENT DIGEST</span><b>{anchor ? shorten(anchor.digest, 14, 10) : "Computed when sealed"}</b></div>
      <div><span>CHAIN</span><b>{anchor ? `Hardhat local · block ${anchor.blockNumber}` : "Local ledger · 31337"}</b></div>
    </div>
    {anchor && <pre className="proof-manifest">{JSON.stringify(anchor.manifest, null, 2)}</pre>}
    {!anchor ? <button className="action-button primary" disabled={!selected || !phash || !searchId || busy} onClick={onAnchor}><Stamp size={13} />{busy ? "WRITING TO LEDGER…" : "SEAL EVIDENCE ON LEDGER →"}</button> : <div className="proof-actions">
      <button className="action-button primary" disabled={busy} onClick={onVerify}><ShieldCheck size={13} />{busy ? "CHECKING…" : "RE-VERIFY AGAINST CHAIN"}</button>
      <button className="action-button secondary" disabled={busy} onClick={isTampered ? onResetTamper : onTamper}>{isTampered ? <RotateCcw size={13} /> : <TriangleAlert size={13} />}{isTampered ? "RESET COMPARISON" : "SIMULATE TAMPER"}</button>
    </div>}
    {verification && <div className={`verification-result ${verification.kind}`}>
      <div className="verification-title"><span>{verification.kind === "verified" ? "✓" : "!"}</span><b>{verification.kind === "verified" ? "VERIFIED · DIGEST MATCH" : "TAMPER DETECTED · DIGEST DIVERGED"}</b></div>
      <div className="verification-grid"><span>EXPECTED<b>{shorten(verification.expected, 14, 8)}</b></span><span>COMPUTED<b>{shorten(verification.computed, 14, 8)}</b></span></div>
      <small>Checked {new Date(verification.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · on-chain URL {shorten(verification.onChainUrl, 22, 10)}</small>
    </div>}
    {anchor && <div className="tx-receipt"><span>TX HASH</span><b>{anchor.txHash}</b></div>}
    {isTampered && <div className="wash" aria-hidden="true" />}
    {isTampered && <span className="stamp-big bad show">TAMPERED</span>}
    </div>
  </article>;
}
