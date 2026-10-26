import type { FlowchartDocument } from "@quirekit/flowchart";
/** Independently reusable diagram or detached selection. */
export interface FlowLibraryItem {
  /** Library-local stable identity, independent of graph cell IDs. */ readonly id: string;
  /** User-facing plain text, at most 80 characters. */ readonly name: string;
  /** Whole-canvas replacement or insertable fragment. */ readonly kind: "template" | "component";
  /** Canonical graph with no host revision or derived preview. */ readonly document: FlowchartDocument;
}
/** Portable, strictly bounded library file. */
export interface FlowLibrary {
  /** Format discriminator. */ readonly format: "quirekit-flow-library";
  /** Supported file version. */ readonly version: 1;
  /** At most 100 reusable entries. */ readonly items: readonly FlowLibraryItem[];
}
/** Storage snapshot with an opaque compare-and-swap token. */
export interface FlowLibrarySnapshot {
  /** Opaque store-owned token; not a diagram revision. */ readonly revision: string;
  /** Validated portable content. */ readonly library: FlowLibrary;
}
/** Host adapter shared by Classic, Block and Markdown workspaces. */
export interface FlowLibraryStore {
  /** @param signal - Dialog lifetime. @returns Current detached snapshot. */ read(signal: AbortSignal): Promise<FlowLibrarySnapshot>;
  /** Must atomically reject a mismatched token before writing.
   * @param library - Complete validated next content.
   * @param expectedRevision - Token from the read that produced this change.
   * @param signal - Cancellation checked before committing.
   * @returns Committed snapshot with a fresh token. */
  write(library: FlowLibrary, expectedRevision: string, signal: AbortSignal): Promise<FlowLibrarySnapshot>;
  /** @param listener - Invalidates stale reads without exposing mutable records. @returns Subscription cleanup. */
  subscribe(listener: () => void): () => void;
}
