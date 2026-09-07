"use client";

import { ReactElement } from "react";
import type { AnchorReceipt, Candidate, WorkflowState } from "./shared";

function getStepState(step: number, workflow: WorkflowState, hasSources: boolean, hasAnchor: boolean): "active" | "done" | "pending" {
  if (step === 1) return hasSources || hasAnchor ? "done" : workflow === "analyzing" ? "active" : "pending";
  if (step === 2) return hasAnchor ? "done" : hasSources ? "active" : "pending";
  return workflow === "verified" || workflow === "tampered" ? "active" : hasAnchor ? "active" : "pending";
}

export function StepRail({ workflow, candidates, anchor }: { workflow: WorkflowState; candidates: Candidate[]; anchor: AnchorReceipt | null }): ReactElement {
  const steps = [
    { number: "01", label: "INTAKE", detail: "Detect and encode one face", state: getStepState(1, workflow, candidates.length > 0, Boolean(anchor)) },
    { number: "02", label: "DISCOVERY", detail: "Review a real indexed source", state: getStepState(2, workflow, candidates.length > 0, Boolean(anchor)) },
    { number: "03", label: "PROOF", detail: "Anchor, then re-check the digest", state: getStepState(3, workflow, candidates.length > 0, Boolean(anchor)) },
  ];
  return <div className="workflow-rail" aria-label="Pipeline progress">
    {steps.map((step, index) => <div className={`workflow-step ${step.state}`} key={step.number}>
      <span className="workflow-number">{step.number}</span>
      <span><b>{step.label}</b><small>{step.detail}</small></span>
      {index < steps.length - 1 && <i className="workflow-line" aria-hidden="true" />}
    </div>)}
  </div>;
}
