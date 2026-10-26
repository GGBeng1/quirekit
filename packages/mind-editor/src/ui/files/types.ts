import type { MindMapDocument } from "@quirekit/mind-map";
import type { QuireKitTheme } from "@quirekit/ui";
import type { XmindDiagnostic } from "@quirekit/mind-map/xmind";

/** Panel-owned serial renderer with bounded successful-image caching. */
export interface MindEditorPreviewRenderer {
  /** @param document - Immutable canonical source. @param theme - Actual host appearance. @param signal - Consumer lifetime.
   * @param priority - Selected detail may precede waiting gallery cards. @returns Complete SVG image URL, without changing the active editor. */
  render(document: MindMapDocument, theme: QuireKitTheme, signal: AbortSignal, priority?: "selection"): Promise<string>;
  /** Cancels queued/in-flight work and releases cached images. */
  dispose(): void;
}

/** Serial queue prioritizing a selected preview without interrupting an active layout. */
export interface MindEditorPreviewQueue {
  /** @param run - Owned asynchronous task. @param signal - Pending task lifetime. @param selected - Whether to precede ordinary queued cards.
   * @returns Task result; pending abort rejects before execution. */
  enqueue<T>(run: () => Promise<T>, signal: AbortSignal, selected?: boolean): Promise<T>;
  /** Rejects queued tasks; the renderer separately aborts its active task. */
  dispose(): void;
}

/** Internal pending job; source and temporary DOM remain in its renderer closure. */
export interface MindEditorPreviewQueueJob {
  /** @returns Task settlement after removing pending abort ownership. */
  start(): Promise<void>;
  /** Rejects and detaches a task that has not started. */
  cancel(): void;
}

/** Validated file contents; the caller chooses how to consume its canvases. */
export interface MindEditorFile {
  /** User-facing source name. */ readonly name: string;
  /** Every canvas, in source order. */ readonly sheets: readonly MindEditorFileSheet[];
  /** Explicit conversion differences from the shared importer. */ readonly diagnostics: readonly XmindDiagnostic[];
}

/** One selectable source canvas. */
export interface MindEditorFileSheet {
  /** Source title; not an identity or command. */ readonly title: string;
  /** Strict portable content, with no runtime references. */ readonly document: MindMapDocument;
}

/** Lightweight feedback retained after a file's canvases have been released. */
export interface MindEditorImportReport {
  /** Import by default; export differences share the same popup presentation. */ readonly operation?: "import" | "export";
  /** Source filename, displayed as text. */ readonly name: string;
  /** Canvas actually loaded into the draft. */ readonly title: string;
  /** Workbook-wide conversion differences, never an approval requirement. */ readonly diagnostics: MindEditorFile["diagnostics"];
}
