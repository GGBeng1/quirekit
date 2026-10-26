import type { Node as PMNode } from "@quirekit/pm";
import type { ClassicEditorRenderContext } from "../../types";

/** Live instance facts read at the final synchronous write boundary. */
export interface ClassicDocumentImportOwner {
  /** @returns Current mounted context, or undefined after unmount. */
  readonly readContext: () => ClassicEditorRenderContext | undefined;
  /** @returns Monotonic accepted-document revision, including silent updates and undo. */
  readonly readRevision: () => number;
}

/** Private attempt state; files and bytes never enter product feedback snapshots. */
export interface ClassicDocumentImportAttempt {
  /** Original context that owns the target session. */
  readonly context: ClassicEditorRenderContext;
  /** Exact starting document identity. */
  readonly document: PMNode;
  /** Starting accepted-document revision. */
  readonly revision: number;
  /** Abort authority retained through final settlement. */
  readonly controller: AbortController;
  /** Successful command completion, after which cancellation cannot undo the import. */
  committed: boolean;
  /** Whether the synchronous command boundary is already occupied. */
  committing: boolean;
  /** Resulting document identity used to avoid renaming a subsequently replaced document. */
  committedDocument?: PMNode | undefined;
}
