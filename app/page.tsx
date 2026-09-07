"use client";
import { ChangeEvent, DragEvent, ReactElement, useMemo, useState } from "react";
import { ArrowRight, ScanFace } from "lucide-react";
import { canonicalShaFor, getContract, getProvider } from "./lib/ethers";
import { manifestForAnchor } from "./lib/canonical";
import { phashHexToBin } from "./lib/phash";
import { ProofCard } from "./components/ProofCard";
import { SourceBoard } from "./components/SourceBoard";
import { SpecimenCard } from "./components/SpecimenCard";
import { StatusBanner } from "./components/StatusBanner";
import { StepRail } from "./components/StepRail";
import { dataUrlToFile, getErrorMessage, navigateTo, nextFileToDataUrl, readJson, shorten, toCandidate, type AnchorReceipt, type Candidate, type Notice, type Verification, type WorkflowState } from "./components/shared";

export default function Page(): ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [phash, setPhash] = useState("");
  const [embeddingSize, setEmbeddingSize] = useState<number | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [searchId, setSearchId] = useState("");
  const [provider, setProvider] = useState("");
  const [workflow, setWorkflow] = useState<WorkflowState>("idle");
  const [notice, setNotice] = useState<Notice>(null);
  const [anchor, setAnchor] = useState<AnchorReceipt | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const selected = useMemo(() => candidates.find((candidate) => candidate.id === selectedId) ?? null, [candidates, selectedId]);
  const busy = workflow === "analyzing" || workflow === "anchoring" || workflow === "verifying";

  async function runSearch(nextFile: File): Promise<void> {
    setWorkflow("analyzing"); setNotice({ kind: "info", text: "Detecting a face, then querying the configured web provider…" });
    setCandidates([]); setSelectedId(""); setAnchor(null); setVerification(null); setSearchId("");
    try {
      const detectForm = new FormData(); detectForm.append("file", nextFile);
      const detection = await readJson(await fetch("/api/detect", { method: "POST", body: detectForm }));
      const crop = String(detection.crop_b64 ?? "");
      setPreviewUrl(crop); setPhash(String(detection.phash_hex ?? detection.phash ?? ""));
      setEmbeddingSize(Array.isArray(detection.embedding) ? detection.embedding.length : null);
      setQuality(typeof detection.quality === "number" ? detection.quality : null);

      const searchForm = new FormData();
      searchForm.append("file", crop ? await dataUrlToFile(crop, nextFile.name) : nextFile);
      let result: Record<string, unknown>; let resultProvider = "SerpApi Lens";
      try { result = await readJson(await fetch("/api/lens", { method: "POST", body: searchForm })); }
      catch (lensError) {
        const vision = await fetch("/api/vision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: await nextFileToDataUrl(nextFile) }) });
        result = await readJson(vision); resultProvider = "Google Vision fallback";
        setNotice({ kind: "info", text: `Lens unavailable (${getErrorMessage(lensError)}). Vision fallback returned the source set.` });
      }
      const rawMatches = [...(Array.isArray(result.visual_matches) ? result.visual_matches : []), ...(Array.isArray(result.pagesWithMatchingImages) ? result.pagesWithMatchingImages : [])] as Record<string, unknown>[];
      const nextCandidates = rawMatches.map((item, index) => toCandidate(item, index, resultProvider)).filter((item): item is Candidate => item !== null).slice(0, 8);
      const metadata = result.search_metadata as Record<string, unknown> | undefined;
      const nextSearchId = String(result.search_id ?? metadata?.id ?? "");
      setSearchId(nextSearchId); setProvider(resultProvider); setCandidates(nextCandidates); setSelectedId(nextCandidates[0]?.id ?? ""); setWorkflow(nextCandidates.length ? "sources" : "idle");
      setNotice(nextCandidates.length ? { kind: "success", text: `${nextCandidates.length} public source${nextCandidates.length === 1 ? "" : "s"} returned with search ID ${shorten(nextSearchId, 10, 6)}.` } : { kind: "info", text: "The provider returned no public source for this face. That is a valid result; nothing was invented." });
    } catch (error) { setWorkflow("idle"); setNotice({ kind: "error", text: `Analysis stopped: ${getErrorMessage(error)}` }); }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const nextFile = event.target.files?.[0] ?? null; if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) { setNotice({ kind: "error", text: "Choose an image file (JPG, PNG, or WEBP)." }); return; }
    setFile(nextFile); await runSearch(nextFile);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>): Promise<void> {
    event.preventDefault(); setIsDragging(false);
    const nextFile = event.dataTransfer.files?.[0]; if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) { setNotice({ kind: "error", text: "Drop an image file (JPG, PNG, or WEBP)." }); return; }
    setFile(nextFile); await runSearch(nextFile);
  }

  async function handleAnchor(): Promise<void> {
    if (!selected || !phash || !searchId) return;
    setWorkflow("anchoring"); setNotice({ kind: "info", text: "Writing the selected source to the local ledger…" });
    try {
      const registry = await readJson(await fetch("/contract.json"));
      const retrievedAt = new Date().toISOString();
      const manifest = manifestForAnchor({ url: selected.url, phashHex: phash, phashBin: phashHexToBin(phash), searchId, platform: selected.host, retrievedAt });
      const digest = canonicalShaFor(manifest); const chain = getProvider("http://127.0.0.1:8545"); const signer = await chain.getSigner(0); const contract = getContract(String(registry.address), signer);
      const transaction = await contract.anchor(digest, BigInt(`0x${phash.replace(/^0x/, "")}`), selected.url, "", "0x" + "0".repeat(64), "0x" + "0".repeat(64));
      const receipt = await transaction.wait(); const nextAnchor = { txHash: String(receipt.hash ?? transaction.hash), blockNumber: Number(receipt.blockNumber), digest, manifest };
      setAnchor(nextAnchor); setWorkflow("sealed"); setNotice({ kind: "success", text: `Evidence sealed on Hardhat block ${nextAnchor.blockNumber}. The receipt is ready to re-check.` });
    } catch (error) { setWorkflow("sources"); setNotice({ kind: "error", text: `Ledger write failed: ${getErrorMessage(error)}. Start Hardhat on port 8545 and deploy FaceAnchor first.` }); }
  }

  async function handleVerify(): Promise<void> {
    if (!anchor || !selected) return;
    setWorkflow("verifying"); setNotice({ kind: "info", text: "Recomputing the manifest and comparing it with the on-chain anchor…" });
    try {
      const registry = await readJson(await fetch("/contract.json")); const providerConnection = getProvider("http://127.0.0.1:8545"); const contract = getContract(String(registry.address), providerConnection);
      const onChain = await contract.verify(anchor.digest); const exists = Boolean(onChain[0]); const onChainUrl = String(onChain[2] ?? ""); const computed = canonicalShaFor(anchor.manifest);
      const isMatch = exists && computed === anchor.digest && onChainUrl === selected.url;
      const nextVerification = { kind: isMatch ? "verified" : "tampered", expected: anchor.digest, computed, onChainUrl, checkedAt: new Date().toISOString() } satisfies Verification;
      setVerification(nextVerification); setWorkflow(nextVerification.kind); setNotice({ kind: isMatch ? "success" : "error", text: isMatch ? "VERIFIED — local recomputation matches the on-chain receipt." : "TAMPER DETECTED — the computed record diverges from the receipt." });
    } catch (error) { setWorkflow("sealed"); setNotice({ kind: "error", text: `Re-verification failed: ${getErrorMessage(error)}.` }); }
  }

  function handleTamper(): void {
    if (!anchor) return;
    const tamperedManifest = { ...anchor.manifest, url: `${anchor.manifest.url}#edited` }; const computed = canonicalShaFor(tamperedManifest);
    setVerification({ kind: "tampered", expected: anchor.digest, computed, onChainUrl: selected?.url ?? String(anchor.manifest.url), checkedAt: new Date().toISOString() }); setWorkflow("tampered"); setNotice({ kind: "error", text: "TAMPER SIMULATION — one URL character changed; the digest no longer matches." });
  }

  function resetCase(): void {
    setFile(null); setPreviewUrl(""); setPhash(""); setEmbeddingSize(null); setQuality(null); setCandidates([]); setSelectedId(""); setSearchId(""); setProvider(""); setWorkflow("idle"); setNotice(null); setAnchor(null); setVerification(null); navigateTo("intake");
  }

  return <main className="sybil-app">
    <div className="classification"><span>RESTRICTED // BIOMETRIC PROVENANCE</span><span>LOCAL ANALYSIS ONLY</span></div>
    <nav className="sybil-nav"><div className="sybil-nav-inner"><button className="sybil-brand" onClick={resetCase}><i /> SYBILWATCH <small>case file</small></button><div className="sybil-tabs"><button className="active" onClick={() => navigateTo("intake")}>01 INTAKE</button><button onClick={() => navigateTo("sources")}>02 SOURCES</button><button onClick={() => navigateTo("proof")}>03 PROOF</button></div><span className={`ledger-status ${anchor ? "sealed" : ""}`}><i /> {anchor ? `SEALED · BLOCK ${anchor.blockNumber}` : "LEDGER READY · 31337"}</span></div></nav>
    <div className="sybil-shell">
      <header className="sybil-hero"><div><div className="eyebrow">HH GOA 2026 / TASK 03</div><h1><span className="w">A</span> <span className="w">face.</span> <span className="w">A</span> <span className="w">source.</span><br /><em className="w">A proof.</em></h1><p>Turn a face image into a traceable evidence record: detect locally, search public indexes, then commit only the fingerprint to a blockchain.</p><div className="hero-actions"><button className="action-button primary" onClick={() => navigateTo("intake")}><ScanFace size={13} />OPEN A CASE ↓</button><button className="text-button" onClick={() => navigateTo("method")}>READ THE METHOD</button></div></div><aside className="scope-note"><span>Scope note</span><b>Reuse detector, not attribution.</b><p>This demo does not identify a person, prove ownership, or infer intent. It records what was found and whether that record changed.</p></aside></header>
      <StepRail workflow={workflow} candidates={candidates} anchor={anchor} />
      <StatusBanner notice={notice} />
      <section className="evidence-grid"><SpecimenCard file={file} previewUrl={previewUrl} embeddingSize={embeddingSize} quality={quality} phash={phash} isDragging={isDragging} searching={workflow === "analyzing"} searchId={searchId} onChange={handleFileChange} onDrop={handleDrop} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} /><SourceBoard candidates={candidates} selectedId={selectedId} searchId={searchId} provider={provider} workflow={workflow} selectionLocked={Boolean(anchor)} onSelect={setSelectedId} /><ProofCard selected={selected} phash={phash} searchId={searchId} anchor={anchor} verification={verification} workflow={workflow} busy={busy} onAnchor={handleAnchor} onVerify={handleVerify} onTamper={handleTamper} onResetTamper={() => { setVerification(null); setWorkflow("sealed"); setNotice({ kind: "info", text: "Comparison reset. The on-chain receipt is unchanged." }); }} /></section>
      <section className="docket-sec"><div className="sec-k">THE DOCKET — THREE MOVES, THAT'S THE WHOLE PRODUCT</div>
      <div className="docket">
        <div className="drow" onClick={() => navigateTo("intake")}><span className="dnum">01.</span><div><h3>Trace the <em>specimen</em></h3><p>We locate the face, check the photo is sharp enough to trust, and compute its 512-number signature — a fingerprint for faces.</p></div><span className="dgo">OPEN SPECIMEN <ArrowRight size={14} /></span></div>
        <div className="drow" onClick={() => navigateTo("sources")}><span className="dnum">02.</span><div><h3>Survey the <em>sources</em></h3><p>The signature is searched across social networks. Every look-alike is pinned down and ranked: same face, weak match, or control sample.</p></div><span className="dgo">OPEN SOURCES <ArrowRight size={14} /></span></div>
        <div className="drow" onClick={() => navigateTo("proof")}><span className="dnum">03.</span><div><h3>Seal the <em>proof</em></h3><p>The evidence is notarised on a ledger — then stress-tested against tampering, live. Change one letter and the fingerprint shatters.</p></div><span className="dgo">OPEN PROOF <ArrowRight size={14} /></span></div>
      </div>
      <div className="band"><div><h3>Open a case in <em>under a minute.</em></h3><p>No signup, no upload — everything runs locally. Built for hire-screening, trust &amp; safety, and OSINT investigators.</p></div><button className="action-button primary" onClick={() => navigateTo("intake")}><ScanFace size={13} />OPEN A CASE</button></div></section>
      <section className="method-strip" id="method"><div><span>WHY THIS SHAPE</span><h2>Evidence first. Claims second.</h2></div><p>The chain does not make a source true. It makes a captured manifest tamper-evident. That distinction is the point of the demo.</p><div className="method-facts"><span><b>01</b> FACE ENCODING<br /><small>local crop + pHash</small></span><span><b>02</b> WEB DISCOVERY<br /><small>provider search ID</small></span><span><b>03</b> CUSTODY<br /><small>hash-only ledger write</small></span></div></section>
    </div>
    <div className="toasts">{notice && <div key={notice.text} className={`toast in ${notice.kind === "success" ? "ok" : notice.kind === "error" ? "" : "warn"}`}>{notice.text}</div>}</div>
    <footer className="sybil-footer"><span>Every face leaves a <em>paper trail.</em></span><small>SYBILWATCH · HH GOA TASK 03 · LOCAL 31337</small><button onClick={resetCase}>RESET CASE</button></footer>
  </main>;
}
