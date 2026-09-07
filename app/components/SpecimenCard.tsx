"use client";

import { ChangeEvent, DragEvent, ReactElement } from "react";
import { phashHexToBin } from "../lib/phash";
import { shorten, type AnalysisStage } from "./shared";

type CheckState = "idle" | "busy" | "done";

export function SpecimenCard({ file, previewUrl, embeddingSize, quality, phash, isDragging, analysisStage, searchId, onChange, onDrop, onDragOver, onDragLeave }: {
  file: File | null; previewUrl: string; embeddingSize: number | null; quality: number | null; phash: string;
  isDragging: boolean; analysisStage: AnalysisStage; searchId: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; onDrop: (event: DragEvent<HTMLDivElement>) => void; onDragOver: (event: DragEvent<HTMLDivElement>) => void; onDragLeave: () => void;
}): ReactElement {
  let bits = "";
  try { if (phash) bits = phashHexToBin(phash); } catch { bits = ""; }
  const setBits = bits ? bits.split("").filter((b) => b === "1").length : 0;
  const isDetecting = analysisStage === "detecting";
  const isEncoding = analysisStage === "encoding";
  const isSearching = analysisStage === "searching";
  const checks: Array<{ n: string; t: string; sub: string; state: CheckState }> = [
    { n: "01", t: "Face located", sub: previewUrl ? "FACE LOCKED · ALIGNED" : isDetecting ? "RETINAFACE · SCANNING…" : "WAITING FOR PHOTO", state: previewUrl ? "done" : isDetecting ? "busy" : "idle" },
    { n: "02", t: "Quality checked", sub: quality !== null ? `QUALITY ${quality.toFixed(2)} / 1.00` : isDetecting ? "MEASURING SHARPNESS…" : "—", state: quality !== null ? "done" : isDetecting ? "busy" : "idle" },
    { n: "03", t: "Fingerprint created", sub: embeddingSize ? `${embeddingSize} NUMBERS · L2-NORMALISED` : isEncoding ? "GHOSTFACENET · CREATING SIGNATURE…" : "—", state: embeddingSize ? "done" : isEncoding ? "busy" : "idle" },
    { n: "04", t: "Web search", sub: searchId ? shorten(searchId, 10, 6) : isSearching ? "QUERYING CONFIGURED PROVIDER…" : "—", state: searchId ? "done" : isSearching ? "busy" : "idle" },
  ];
  const doneCount = checks.filter((c) => c.state === "done").length;
  const progress = analysisStage === "detecting" ? 12 : analysisStage === "encoding" ? 75 : analysisStage === "searching" ? 75 : analysisStage === "complete" ? 100 : doneCount * 25;
  const pipelineStatus = analysisStage === "detecting" ? "DETECTING FACE" : analysisStage === "encoding" ? "BUILDING SIGNATURE" : analysisStage === "searching" ? "SEARCHING WEB" : analysisStage === "complete" ? "COMPLETE" : analysisStage === "error" ? "FAILED" : file ? "READY" : "WAITING";
  return <article className="evidence-card specimen-card" id="intake">
    <div className="specimen-wrap">
    <i className="tape tl" aria-hidden="true" /><i className="tape tr" aria-hidden="true" />
    <span className="spec-tag">SPECIMEN №0001</span>
    <span className="exhtag">EXHIBIT A<br /><b>INTAKE PHOTO</b></span>
    <div className="card-kicker"><span>01 / INTAKE</span><span className="card-status">{file ? "READY" : "WAITING"}</span></div>
    <div className={`specimen-frame ${isDragging ? "dragging" : ""} ${previewUrl ? "has-image" : ""}`} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}>
      {previewUrl ? <img src={previewUrl} alt="Detected face crop" /> : <label className="upload-prompt">
        <span className="upload-glyph">+</span><b>DROP A FACE IMAGE</b><small>JPG, PNG, WEBP · processed in memory</small><input type="file" accept="image/*" onChange={onChange} />
      </label>}
      <i className="ret tl" aria-hidden="true" /><i className="ret tr" aria-hidden="true" /><i className="ret bl" aria-hidden="true" /><i className="ret br" aria-hidden="true" />
      {previewUrl && <span className="face-lock">FACE CROP LOCKED</span>}
      {previewUrl && <span className="stamp onphoto stamp-acq show">ACQUIRED</span>}
    </div>
    <div className="spec-cap">
      <span>EXHIBIT A — INTAKE PHOTO</span>
      {previewUrl ? <span id="upReady">READY</span> : <span>WAITING</span>}
    </div>
    <div className="specimen-meta">
      <div><span>FILE</span><b>{file?.name ?? "No specimen selected"}</b></div>
      <div><span>ENCODER</span><b>{embeddingSize ? `Face embedding · ${embeddingSize}-d` : "Not run"}</b></div>
      <div><span>QUALITY / pHASH</span><b>{quality !== null ? quality.toFixed(2) : "—"} <em>·</em> {phash ? shorten(phash, 8, 6) : "—"}</b></div>
    </div>
    <div className="indexcard" aria-hidden="true">
      <div className="row"><span>FILE</span><b>{file?.name ?? "—"}</b></div>
      <div className="row"><span>ENCODER</span><b>{embeddingSize ? `${embeddingSize}-d` : "—"}</b></div>
      <div className="row"><span>QUALITY</span><b>{quality !== null ? quality.toFixed(2) : "—"}</b></div>
      <div className="row"><span>STATUS</span><b>{previewUrl ? "ACQUIRED" : "OPEN"}</b></div>
    </div>
    <div className="panel specimen-panel" aria-live="polite">
      <div className="p-head"><span>INTAKE PIPELINE — LIVE</span><span className={`st pipeline-status ${analysisStage === "error" ? "error" : ""}`}>{pipelineStatus}</span></div>
      <div className={`p-progress${progress >= 100 ? " full" : ""}`}><i style={{ width: `${progress}%` }} /></div>
      <div className="p-body"><ul className="cklist">{checks.map((c) => <li className={`ck ${c.state === "idle" ? "" : c.state}`} key={c.n}><span className="ck-n">{c.n}</span><div className="ck-tx"><b>{c.t}</b><span className="t">{c.sub}</span></div><span className="ck-ic">{c.state === "busy" ? <span className="spin" /> : c.state === "done" ? <svg className="tick" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg> : null}</span></li>)}</ul></div>
    </div>
    <dl className="tele">
      <div><dt>QUALITY METRIC</dt><dd><b>{quality !== null ? quality.toFixed(2) : "0.00"}</b>{quality !== null && <i className="mini">PASSED</i>}</dd></div>
      <div><dt>MODEL</dt><dd>GHOSTFACENET · 512-d</dd></div>
      <div><dt>pHash-64</dt><dd>0x{phash || "—"}</dd></div>
    </dl>
    <div className="chart-card">
      <div className="chart-h"><span>PHASH-64 BIT PATTERN</span><span>HAMMING SPACE</span></div>
      <div className="phbits">{bits ? bits.split("").map((b, i) => <i key={i} data-one={b} />) : <span className="phbits-empty">AWAITING SPECIMEN</span>}</div>
      <div className="spark-stats"><span>{bits ? `${setBits} / 64 BITS SET` : "—"}</span><span>64 dims</span></div>
    </div>
    </div>
  </article>;
}
