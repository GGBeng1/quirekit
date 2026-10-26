import { readFlowchart } from "../model/document";
import type { FlowchartDocument } from "../model/types";
import type { FlowchartDraft } from "./types";

/** @param targetId - Stable host identity. @param document - Opening source. @returns Detached compare-and-swap authoring session. */
export function createFlowchartDraft(targetId: string, document: FlowchartDocument): FlowchartDraft {
  if (!targetId.trim() || targetId.length > 256) throw new TypeError("Invalid flowchart target identity");
  let current = readFlowchart(document);
  const expectedRevision = current.revision;
  let phase: "active" | "committing" | "closed" = "active";
  /** Requires an active session, excluding reentrant host callbacks. */
  function requireActive(): void {
    if (phase !== "active") throw new Error("Flowchart draft is not active");
  }
  return {
    /** @returns Current immutable source. */
    getDocument() { requireActive(); return current; },
    /** @param next - New source with the original revision. */
    replace(next) {
      requireActive(); const checked = readFlowchart(next);
      if (checked.revision !== expectedRevision) throw new Error("Flowchart base revision changed");
      current = checked;
    },
    /** @param commit - Atomic host transaction. @returns Outcome, retaining the draft on failure. */
    save(commit) {
      requireActive();
      const replacement = readFlowchart({ ...current, revision: expectedRevision + 1 });
      phase = "committing";
      try {
        const result = commit(Object.freeze({ targetId, expectedRevision, document: replacement }));
        if (!["saved", "conflict", "readonly", "missing"].includes(result)) throw new TypeError("Flowchart commit must return a synchronous outcome");
        phase = result === "saved" ? "closed" : "active";
        return result;
      } catch (error) { phase = "active"; throw error; }
    },
    /** Closes without calling the host. */
    cancel() {
      if (phase === "committing") throw new Error("Cannot cancel inside a host transaction");
      phase = "closed";
    },
  };
}
