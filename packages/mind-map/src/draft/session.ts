import { readMindMapDocument } from "../model/document";
import type { MindMapDocument } from "../model/types";
import type { MindMapDraft } from "./types";

/**
 * Opens a detached draft with an immutable base revision.
 * @param targetId - Host-owned stable target identity.
 * @param document - Current canonical source.
 * @returns A single-use save/cancel session.
 */
export function createMindMapDraft(targetId: string, document: MindMapDocument): MindMapDraft {
  if (!targetId.trim() || targetId.length > 256) throw new TypeError("Invalid mind map target identity");
  let current = readMindMapDocument(document);
  const expectedRevision = current.revision;
  let state: "active" | "committing" | "closed" = "active";
  /** Requires an open session, excluding reentrant host callbacks. */
  function assertActive(): void {
    if (state !== "active") throw new Error("Mind map draft is not active");
  }
  return {
    /** @returns Immutable source for an active session. */
    getDocument() { assertActive(); return current; },
    /** @param next - Replacement source at the unchanged base revision. */
    replace(next) {
      assertActive();
      const checked = readMindMapDocument(next);
      if (checked.revision !== expectedRevision) throw new Error("Mind map draft base revision changed");
      current = checked;
    },
    /** @param commit - Atomic host transaction. @returns Host outcome. */
    save(commit) {
      assertActive();
      const replacement = readMindMapDocument({ ...current, revision: expectedRevision + 1 });
      state = "committing";
      try {
        const result = commit(Object.freeze({ targetId, expectedRevision, document: replacement }));
        if (!["saved", "conflict", "readonly", "missing"].includes(result)) {
          throw new TypeError("Mind map commit must return a synchronous host outcome");
        }
        state = result === "saved" ? "closed" : "active";
        return result;
      } catch (error) {
        state = "active";
        throw error;
      }
    },
    /** Closes without mutating the host or permitting reentrant cancellation. */
    cancel() {
      if (state === "committing") throw new Error("Cannot cancel inside a host transaction");
      state = "closed";
    },
  };
}
