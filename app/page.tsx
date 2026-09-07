"use client";

import { ChangeEvent, DragEvent, ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ImageUp, Play, RefreshCw, ScanFace } from "lucide-react";
import { canonicalShaFor, getContract, getProvider } from "./lib/ethers";
import { manifestForAnchor } from "./lib/canonical";
import { phashHexToBin } from "./lib/phash";
import { ProofCard } from "./components/ProofCard";
import { SourceBoard } from "./components/SourceBoard";
import { SpecimenCard } from "./components/SpecimenCard";
import { StatusBanner } from "./components/StatusBanner";
import { dataUrlToFile, getErrorMessage, nextFileToDataUrl, readJson, shorten, toCandidate, type AnalysisStage, type AnchorReceipt, type Candidate, type Notice, type Verification, type WorkflowState } from "./components/shared";

type RouteName = "home" | "specimen" | "sources" | "proof";

function readRoute(): RouteName {
  if (typeof window === "undefined") return "home";
  const route = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  return route === "specimen" || route === "sources" || route === "proof" ? route : "home";
}

function routeHref(route: RouteName): string { return route === "home" ? "#/" : `#/${route}`; }

function HomeRoute({ previewUrl, onFileChange, onOpen }: { previewUrl: string; onFileChange: (event: ChangeEvent<HTMLInputElement>) => void; onOpen: (route: RouteName) => void }): ReactElement {
  return <section className="route on" id="r-home">
    <div className="wrap">
      <div className="hero">
        <div>
          <span className="kick">BIOMETRIC PROVENANCE · FOR TRUST &amp; SAFETY TEAMS</span>
          <h1 aria-label="Every face leaves a paper trail."><span className="w" style={{ "--d": ".05s" } as React.CSSProperties}>Every</span> <span className="w" style={{ "--d": ".13s" } as React.CSSProperties}>face</span> <span className="w" style={{ "--d": ".21s" } as React.CSSProperties}>leaves</span> <span className="w" style={{ "--d": ".29s" } as React.CSSProperties}>a</span> <em className="w" style={{ "--d": ".4s" } as React.CSSProperties}>paper trail.</em></h1>
          <p className="lede">Drop in any profile photo. <b>SybilWatch</b> finds public sources carrying the same face, then seals the evidence with a fingerprint <b>nobody can quietly rewrite</b>.</p>
          <div className="hero-cta"><a className="btn btn-p btn-lg" href={routeHref("specimen")}><ScanFace size={14} />OPEN A CASE</a><button className="btn btn-lg" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}><ArrowDown size={14} />READ THE DOCKET</button></div>
          <div className="hero-meta"><span>512-D FACE SIGNATURE</span><span>pHash-64</span><span>SHA-256 EVIDENCE</span><span>EIP-712</span><span>LEDGER 31337</span></div>
        </div>
        <div className="hero-right">
          <div className="spec-card home-spec-card">
            <i className="tape tl" aria-hidden="true" /><i className="tape tr" aria-hidden="true" />
            <span className="spec-tag">SPECIMEN №0001</span><span className="exhtag">EXHIBIT A<br /><b>INTAKE PHOTO</b></span>
            <div className={`ph ${previewUrl ? "has-img" : ""}`} title="Drop a photo on the specimen route, or open a case">{previewUrl ? <img src={previewUrl} alt="Uploaded specimen crop" /> : <div className="up-empty"><ImageUp size={24} /><span>OPEN A CASE<br />UPLOAD A SPECIMEN</span></div>}<i className="ret tl" /><i className="ret tr" /><i className="ret bl" /><i className="ret br" /></div>
            <div className="spec-cap"><span>EXHIBIT A — INTAKE PHOTO</span>{previewUrl && <span id="upReady">READY</span>}</div>
            <div className="spec-cap home-upload"><label className="btn btn-p"><ImageUp size={13} />USE PHOTO<input type="file" accept="image/*" onChange={(event) => { onFileChange(event); onOpen("specimen"); }} /></label><span>Stays in this browser.</span></div>
          </div>
          <div className="indexcard" aria-hidden="true"><div className="row"><span>CASE</span><b>LOCAL RUN</b></div><div className="row"><span>SUBJECT</span><b>UNVERIFIED</b></div><div className="row"><span>ANALYST</span><b>BROWSER</b></div><div className="row"><span>STATUS</span><b style={{ color: "var(--vermd)" }}>OPEN</b></div></div>
        </div>
      </div>
      <div className="sec-k" id="how">THE DOCKET — THREE MOVES, THAT&apos;S THE WHOLE PRODUCT</div>
      <div className="docket">
        <button className="drow" onClick={() => onOpen("specimen")}><span className="dnum">01.</span><span><h3>Trace the <em>specimen</em></h3><p>Locate the face, check the photo is sharp enough to trust, and compute its 512-number signature.</p></span><span className="dgo">OPEN SPECIMEN <ArrowRight size={14} /></span></button>
        <button className="drow" onClick={() => onOpen("sources")}><span className="dnum">02.</span><span><h3>Survey the <em>sources</em></h3><p>Search public indexes and pin every returned source to the case, with the live provider ID preserved.</p></span><span className="dgo">OPEN SOURCES <ArrowRight size={14} /></span></button>
        <button className="drow" onClick={() => onOpen("proof")}><span className="dnum">03.</span><span><h3>Seal the <em>proof</em></h3><p>Commit the manifest to the ledger, then change one character and watch the fingerprint diverge.</p></span><span className="dgo">OPEN PROOF <ArrowRight size={14} /></span></button>
      </div>
      <div className="band"><div><h3>Open a case in <em>under a minute.</em></h3><p>No signup, no invented matches — the pipeline shows its real provider and its real failure modes.</p></div><a className="btn btn-p btn-lg" href={routeHref("specimen")}><ScanFace size={14} />OPEN A CASE</a></div>
      <section className="method-strip" id="method"><div><span>WHY THIS SHAPE</span><h2>Evidence first. Claims second.</h2></div><p>The chain does not make a source true. It makes a captured manifest tamper-evident. That distinction is the point of the demo.</p><div className="method-facts"><span><b>01</b> FACE ENCODING<br /><small>local crop + pHash</small></span><span><b>02</b> WEB DISCOVERY<br /><small>provider search ID</small></span><span><b>03</b> CUSTODY<br /><small>hash-only ledger write</small></span></div></section>
    </div>
  </section>;
}

function SpecimenRoute({ file, previewUrl, embeddingSize, quality, phash, isDragging, analysisStage, searchId, candidates, onChange, onDrop, onDragOver, onDragLeave, onOpenSources, onRerun }: {
  file: File | null; previewUrl: string; embeddingSize: number | null; quality: number | null; phash: string; isDragging: boolean; analysisStage: AnalysisStage; searchId: string; candidates: Candidate[];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void; onDrop: (event: DragEvent<HTMLDivElement>) => void; onDragOver: (event: DragEvent<HTMLDivElement>) => void; onDragLeave: () => void; onOpenSources: () => void; onRerun: () => void;
}): ReactElement {
  return <section className="route on" id="r-specimen"><div className="wrap">
    <div className="pg-k">01 // SPECIMEN — FACE INTAKE</div><div className="pg-row"><h2 className="pg-t">Measure the face.</h2><button className="btn" disabled={!file || analysisStage === "detecting" || analysisStage === "encoding" || analysisStage === "searching"} onClick={onRerun}><RefreshCw size={13} />RE-RUN THE SCAN</button></div>
    <p className="pg-s">We turn the photo into something a computer can compare. The checklist runs live, in order, and stops visibly when a provider is unavailable.</p>
    <div className="plain"><span className="mono">IN PLAIN TERMS</span><span>The computer <b>finds the face</b>, checks the photo is <b>sharp enough to trust</b>, then boils it down to <b>512 numbers</b>.</span></div>
    <div className="scan-grid"><div><SpecimenCard file={file} previewUrl={previewUrl} embeddingSize={embeddingSize} quality={quality} phash={phash} isDragging={isDragging} analysisStage={analysisStage} searchId={searchId} onChange={onChange} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} /></div><div className="panel route-sidecard"><div className="p-head"><span>CASE INTAKE — LIVE</span><span className="st">{analysisStage === "detecting" || analysisStage === "encoding" || analysisStage === "searching" ? "RUNNING" : analysisStage === "error" ? "FAILED" : candidates.length ? "READY" : "WAITING"}</span></div><div className="p-body"><h3>{analysisStage === "detecting" ? "Finding the face…" : analysisStage === "encoding" ? "Building the fingerprint…" : analysisStage === "searching" ? "Searching public sources…" : analysisStage === "error" ? "Analysis stopped." : candidates.length ? "Face scan complete." : analysisStage === "complete" ? "No public sources found." : "Start with one face image."}</h3><p>{analysisStage === "detecting" || analysisStage === "encoding" || analysisStage === "searching" ? "This browser is processing the uploaded specimen now. The pipeline below updates from each real response." : analysisStage === "error" ? "The real provider error is shown above. Fix the configuration or choose another image to run the pipeline again." : candidates.length ? "The provider returned sources. Continue to the discovery board to choose the evidence you want to seal." : analysisStage === "complete" ? "The configured provider returned no match for this image. Nothing has been substituted or invented." : "Nothing is searched until a specimen is selected. Raw image buffers stay in memory for this run."}</p><button className="btn btn-p btn-w btn-lg" disabled={!candidates.length || analysisStage !== "complete"} onClick={onOpenSources}>VIEW THE SOURCES <ArrowRight size={14} /></button></div></div></div>
  </div></section>;
}

function SourcesRoute({ previewUrl, candidates, selectedId, searchId, provider, workflow, anchor, onSelect, onOpenProof }: { previewUrl: string; candidates: Candidate[]; selectedId: string; searchId: string; provider: string; workflow: WorkflowState; anchor: AnchorReceipt | null; onSelect: (id: string) => void; onOpenProof: () => void }): ReactElement {
  return <section className="route on" id="r-sources"><div className="wrap">
    <div className="pg-k">02 // SOURCES — SAME-FACE SEARCH</div><div className="pg-row"><h2 className="pg-t">Where else does this <em>face</em> appear?</h2><button className="btn btn-p" disabled={!candidates.length || !selectedId || Boolean(anchor)} onClick={onOpenProof}>SEAL THIS MATCH <ArrowRight size={14} /></button></div>
    <p className="pg-s">Every card is a public result returned by the configured provider. Click a card to pull it into the case; the selected source becomes the only candidate the proof route can seal.</p>
    <div className="plain"><span className="mono">IN PLAIN TERMS</span><span><b>Search results are evidence, not identity proof.</b> The source URL and provider search ID are preserved so the lookup can be audited.</span></div>
    <div className="board"><div className="board-left"><div className="spec-card source-spec-card"><i className="tape tl" /><span className="spec-tag">EXHIBIT A</span><div className={`ph ${previewUrl ? "has-img" : ""}`}>{previewUrl ? <img src={previewUrl} alt="Uploaded specimen crop" /> : <div className="up-empty"><ImageUp size={24} /><span>NO SPECIMEN LOADED<br />OPEN SPECIMEN ROUTE</span></div>}<i className="ret tl" /><i className="ret tr" /><i className="ret bl" /><i className="ret br" /></div><div className="spec-cap"><span>SPECIMEN №0001</span><span>{previewUrl ? "THE INPUT" : "WAITING"}</span></div></div><p className="board-note">One face, pinned. The results board keeps the source list separate from the proof record.</p></div><SourceBoard candidates={candidates} selectedId={selectedId} searchId={searchId} provider={provider} workflow={workflow} selectionLocked={Boolean(anchor)} onSelect={onSelect} /></div>
  </div></section>;
}

function ProofRoute({ selected, phash, searchId, anchor, verification, workflow, busy, onAnchor, onVerify, onTamper, onResetTamper }: { selected: Candidate | null; phash: string; searchId: string; anchor: AnchorReceipt | null; verification: Verification | null; workflow: WorkflowState; busy: boolean; onAnchor: () => void; onVerify: () => void; onTamper: () => void; onResetTamper: () => void }): ReactElement {
  return <section className="route on" id="r-proof"><div className="wrap">
    <div className="pg-k">03 // PROOF — CUSTODY &amp; NOTARISATION</div><div className="pg-row"><h2 className="pg-t">Seal it so it can&apos;t be <em>denied.</em></h2></div><p className="pg-s">One certificate, one desk. Seal the evidence, attack it, and re-check the receipt against the local ledger.</p>
    <div className="plain"><span className="mono">IN PLAIN TERMS</span><span>A digest works like a wax seal: change <b>one letter</b> anywhere in the evidence and the whole fingerprint changes.</span></div>
    <div className="cust-grid"><div className="cert"><ProofCard selected={selected} phash={phash} searchId={searchId} anchor={anchor} verification={verification} workflow={workflow} busy={busy} onAnchor={onAnchor} onVerify={onVerify} onTamper={onTamper} onResetTamper={onResetTamper} /></div><div className="rail"><div className="rail-k">CERTIFICATION DESK — FOLLOW THE STEPS</div><div className={`stepcard ${anchor ? "done" : ""}`}><span className="sn">01</span><h3>Seal on the ledger</h3><p className="sc-p">Writes the manifest fingerprint onto chain 31337. The original image is not stored on-chain.</p><span className={`schip ${anchor ? "ok" : ""}`}>{anchor ? `BLOCK ${anchor.blockNumber}` : "NOT SEALED"}</span></div><i className={`connector ${anchor ? "fill" : ""}`} /><div className={`tamp-panel ${workflow === "tampered" ? "tamper-active" : ""}`}><h3>02 — Stress-test the seal</h3><p className="sc-p">Simulate one edited URL character and compare the new digest with the receipt.</p><span className="schip">{workflow === "tampered" ? "DIVERGENCE DETECTED" : "READY TO TEST"}</span></div><i className={`connector ${verification?.kind === "verified" ? "fill" : ""}`} /><div className={`stepcard ${verification?.kind === "verified" ? "done" : ""}`}><span className="sn">03</span><h3>Re-verify the record</h3><p className="sc-p">Recompute the canonical manifest and compare it with the on-chain URL and digest.</p><span className={`schip ${verification?.kind === "verified" ? "ok" : verification?.kind === "tampered" ? "bad" : ""}`}>{verification?.kind === "verified" ? "VERIFIED" : verification?.kind === "tampered" ? "TAMPERED" : "NOT CHECKED"}</span></div></div></div>
  </div></section>;
}

export default function Page(): ReactElement {
  const [route, setRoute] = useState<RouteName>("home");
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
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("idle");
  const activeRunRef = useRef(0);
  const selected = useMemo(() => candidates.find((candidate) => candidate.id === selectedId) ?? null, [candidates, selectedId]);
  const busy = workflow === "analyzing" || workflow === "anchoring" || workflow === "verifying";

  useEffect(() => {
    const syncRoute = (): void => {
      setRoute(readRoute());
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  function openRoute(nextRoute: RouteName): void { window.location.hash = routeHref(nextRoute); window.scrollTo({ top: 0, behavior: "auto" }); }

  async function runSearch(nextFile: File): Promise<void> {
    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    setAnalysisStage("detecting");
    setWorkflow("analyzing"); setNotice({ kind: "info", text: "Detecting a face, then querying the configured web provider…" }); setCandidates([]); setSelectedId(""); setAnchor(null); setVerification(null); setSearchId("");
    try {
      const detectForm = new FormData(); detectForm.append("file", nextFile); const detection = await readJson(await fetch("/api/detect", { method: "POST", body: detectForm })); const crop = String(detection.crop_b64 ?? "");
      if (runId !== activeRunRef.current) return;
      setPreviewUrl(crop); setPhash(String(detection.phash_hex ?? detection.phash ?? "")); setEmbeddingSize(Array.isArray(detection.embedding) ? detection.embedding.length : null); setQuality(typeof detection.quality === "number" ? detection.quality : null);
      setAnalysisStage("encoding");
      const searchForm = new FormData(); searchForm.append("file", crop ? await dataUrlToFile(crop, nextFile.name) : nextFile); let result: Record<string, unknown>; let resultProvider = "SerpApi Lens";
      if (runId !== activeRunRef.current) return;
      setAnalysisStage("searching");
      try { result = await readJson(await fetch("/api/lens", { method: "POST", body: searchForm })); } catch (lensError) { const vision = await fetch("/api/vision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: await nextFileToDataUrl(nextFile) }) }); result = await readJson(vision); resultProvider = "Google Vision fallback"; setNotice({ kind: "info", text: `Lens unavailable (${getErrorMessage(lensError)}). Vision fallback returned the source set.` }); }
      const rawMatches = [...(Array.isArray(result.visual_matches) ? result.visual_matches : []), ...(Array.isArray(result.pagesWithMatchingImages) ? result.pagesWithMatchingImages : [])] as Record<string, unknown>[]; const nextCandidates = rawMatches.map((item, index) => toCandidate(item, index, resultProvider)).filter((item): item is Candidate => item !== null).slice(0, 8); const metadata = result.search_metadata as Record<string, unknown> | undefined; const nextSearchId = String(result.search_id ?? metadata?.id ?? "");
      if (runId !== activeRunRef.current) return;
      setSearchId(nextSearchId); setProvider(resultProvider); setCandidates(nextCandidates); setSelectedId(nextCandidates[0]?.id ?? ""); setWorkflow(nextCandidates.length ? "sources" : "idle"); setAnalysisStage("complete"); setNotice(nextCandidates.length ? { kind: "success", text: `${nextCandidates.length} public source${nextCandidates.length === 1 ? "" : "s"} returned with search ID ${shorten(nextSearchId, 10, 6)}.` } : { kind: "info", text: "The provider returned no public source for this face. That is a valid result; nothing was invented." });
    } catch (error) {
      if (runId !== activeRunRef.current) return;
      setWorkflow("idle"); setAnalysisStage("error"); setNotice({ kind: "error", text: `Analysis stopped: ${getErrorMessage(error)}` });
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> { const nextFile = event.target.files?.[0] ?? null; if (!nextFile) return; if (!nextFile.type.startsWith("image/")) { setNotice({ kind: "error", text: "Choose an image file (JPG, PNG, or WEBP)." }); return; } setFile(nextFile); openRoute("specimen"); await runSearch(nextFile); }
  async function handleDrop(event: DragEvent<HTMLDivElement>): Promise<void> { event.preventDefault(); setIsDragging(false); const nextFile = event.dataTransfer.files?.[0]; if (!nextFile) return; if (!nextFile.type.startsWith("image/")) { setNotice({ kind: "error", text: "Drop an image file (JPG, PNG, or WEBP)." }); return; } setFile(nextFile); await runSearch(nextFile); }
  async function handleAnchor(): Promise<void> { if (!selected || !phash || !searchId) return; setWorkflow("anchoring"); setNotice({ kind: "info", text: "Writing the selected source to the local ledger…" }); try { const registry = await readJson(await fetch("/contract.json")); const manifest = manifestForAnchor({ url: selected.url, phashHex: phash, phashBin: phashHexToBin(phash), searchId, platform: selected.host, retrievedAt: new Date().toISOString() }); const digest = canonicalShaFor(manifest); const chain = getProvider("http://127.0.0.1:8545"); const signer = await chain.getSigner(0); const contract = getContract(String(registry.address), signer); const transaction = await contract.anchor(digest, BigInt(`0x${phash.replace(/^0x/, "")}`), selected.url, "", "0x" + "0".repeat(64), "0x" + "0".repeat(64)); const receipt = await transaction.wait(); const nextAnchor = { txHash: String(receipt.hash ?? transaction.hash), blockNumber: Number(receipt.blockNumber), digest, manifest }; setAnchor(nextAnchor); setWorkflow("sealed"); setNotice({ kind: "success", text: `Evidence sealed on Hardhat block ${nextAnchor.blockNumber}.` }); } catch (error) { setWorkflow("sources"); setNotice({ kind: "error", text: `Ledger write failed: ${getErrorMessage(error)}. Start Hardhat on port 8545 and deploy FaceAnchor first.` }); } }
  async function handleVerify(): Promise<void> { if (!anchor || !selected) return; setWorkflow("verifying"); setNotice({ kind: "info", text: "Recomputing the manifest and comparing it with the on-chain anchor…" }); try { const registry = await readJson(await fetch("/contract.json")); const contract = getContract(String(registry.address), getProvider("http://127.0.0.1:8545")); const onChain = await contract.verify(anchor.digest); const onChainUrl = String(onChain[2] ?? ""); const computed = canonicalShaFor(anchor.manifest); const isMatch = Boolean(onChain[0]) && computed === anchor.digest && onChainUrl === selected.url; const nextVerification = { kind: isMatch ? "verified" : "tampered", expected: anchor.digest, computed, onChainUrl, checkedAt: new Date().toISOString() } satisfies Verification; setVerification(nextVerification); setWorkflow(nextVerification.kind); setNotice({ kind: isMatch ? "success" : "error", text: isMatch ? "VERIFIED — local recomputation matches the on-chain receipt." : "TAMPER DETECTED — the computed record diverges from the receipt." }); } catch (error) { setWorkflow("sealed"); setNotice({ kind: "error", text: `Re-verification failed: ${getErrorMessage(error)}.` }); } }
  function handleTamper(): void { if (!anchor) return; const computed = canonicalShaFor({ ...anchor.manifest, url: `${anchor.manifest.url}#edited` }); setVerification({ kind: "tampered", expected: anchor.digest, computed, onChainUrl: selected?.url ?? String(anchor.manifest.url), checkedAt: new Date().toISOString() }); setWorkflow("tampered"); setNotice({ kind: "error", text: "TAMPER SIMULATION — one URL character changed; the digest no longer matches." }); }
  function resetCase(): void { setFile(null); setPreviewUrl(""); setPhash(""); setEmbeddingSize(null); setQuality(null); setCandidates([]); setSelectedId(""); setSearchId(""); setProvider(""); setWorkflow("idle"); setAnalysisStage("idle"); setNotice(null); setAnchor(null); setVerification(null); openRoute("home"); }

  return <main className="sybil-app">
    <div className="classbar"><span><span className="r">UNCLASSIFIED</span> · PUBLIC DEMONSTRATION BUILD · CASE LOCAL RUN</span><span>ALL ANALYSIS RUNS IN THIS BROWSER — RAW PHOTO IS NOT STORED</span></div>
    <nav className="nav"><div className="nav-in"><a className="brand" href="#/"><span className="brandmark" />SYBILWATCH <small>case files</small></a><div className="tabs"><a className={`tab ${route === "home" ? "on" : ""}`} href="#/">CASE FILE</a><a className={`tab ${route === "specimen" ? "on" : ""}`} href="#/specimen"><s>01</s>SPECIMEN</a><a className={`tab ${route === "sources" ? "on" : ""}`} href="#/sources"><s>02</s>SOURCES</a><a className={`tab ${route === "proof" ? "on" : ""}`} href="#/proof"><s>03</s>PROOF</a></div><div className={`nav-status ${anchor ? "ok" : ""}`}><span className={`dot ${anchor ? "seal" : ""}`} />{anchor ? `SEALED · BLOCK ${anchor.blockNumber}` : "LEDGER: LOCAL 31337 · READY"}</div></div></nav>
    {notice && <div className="route-notice"><div className="wrap"><StatusBanner notice={notice} /></div></div>}
    {route === "home" && <HomeRoute previewUrl={previewUrl} onFileChange={handleFileChange} onOpen={openRoute} />}
    {route === "specimen" && <SpecimenRoute file={file} previewUrl={previewUrl} embeddingSize={embeddingSize} quality={quality} phash={phash} isDragging={isDragging} analysisStage={analysisStage} searchId={searchId} candidates={candidates} onChange={handleFileChange} onDrop={handleDrop} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onOpenSources={() => openRoute("sources")} onRerun={() => { if (file) void runSearch(file); }} />}
    {route === "sources" && <SourcesRoute previewUrl={previewUrl} candidates={candidates} selectedId={selectedId} searchId={searchId} provider={provider} workflow={workflow} anchor={anchor} onSelect={setSelectedId} onOpenProof={() => openRoute("proof")} />}
    {route === "proof" && <ProofRoute selected={selected} phash={phash} searchId={searchId} anchor={anchor} verification={verification} workflow={workflow} busy={busy} onAnchor={handleAnchor} onVerify={handleVerify} onTamper={handleTamper} onResetTamper={() => { setVerification(null); setWorkflow("sealed"); setNotice({ kind: "info", text: "Comparison reset. The on-chain receipt is unchanged." }); }} />}
    <footer className="foot"><span className="fq">Every face leaves a <em>paper trail.</em></span><span className="fm">SYBILWATCH · HH GOA TASK 03 · <b>DOCKET /{route.toUpperCase()}</b></span><button className="fm" onClick={resetCase}>RESET CASE</button></footer>
  </main>;
}
