"use client";

import { ReactElement } from "react";
import type { Notice } from "./shared";

export function StatusBanner({ notice }: { notice: Notice }): ReactElement | null {
  if (!notice) return null;
  return <div className={`status-banner ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
    <span className="status-mark" aria-hidden="true">{notice.kind === "success" ? "✓" : notice.kind === "error" ? "!" : "·"}</span>
    <span>{notice.text}</span>
  </div>;
}
