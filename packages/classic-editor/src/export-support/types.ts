import type { QuireEditor } from "@quirekit/core";
import type { QuirePageGeometry } from "@quirekit/layout/pagination";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireDisplayList, QuireRect } from "@quirekit/renderer";

/** Resolved Classic policy for one fixed-layout export pass. */
export interface ClassicEditorFixedLayoutGeometry {
  /** Viewport seed used even when a Word document supplies its own page geometry. */
  readonly viewportRect: QuireRect;
  /** Explicit or generic geometry; omitted when the document owns Word geometry. */
  readonly pageGeometry?: QuirePageGeometry | undefined;
}

/** Inputs for one targetless, content-only Classic frame compilation. */
export interface BuildClassicEditorFixedLayoutFrameOptions {
  /** Canonical editor whose current document is compiled. */
  readonly editor: QuireEditor;
  /** Resolved Classic page and viewport policy. */
  readonly geometry: ClassicEditorFixedLayoutGeometry;
  /** Exact text measurement authority shared with the consuming encoder. */
  readonly textMeasurer: QuireTextMeasurer;
}

/** One immutable physical content page in a targetless Classic frame. */
export interface ClassicEditorFixedLayoutFramePage {
  /** Zero-based physical page index. */
  readonly pageIndex: number;
  /** Page rectangle in document-space CSS pixels. */
  readonly pageRect: QuireRect;
  /** Persistent content commands, excluding caret and overlay presentation. */
  readonly contentDisplayList: QuireDisplayList;
}

/** Format-neutral products shared by fixed-layout Classic export adapters. */
export interface ClassicEditorFixedLayoutFrame {
  /** Ordered, frozen physical content pages. */
  readonly pages: readonly ClassicEditorFixedLayoutFramePage[];
  /** Measurement authority used to produce the frame. */
  readonly textMeasurer: QuireTextMeasurer;
}

/** Stable reasons a targetless Classic frame cannot be produced. */
export type ClassicEditorFixedLayoutFrameErrorCode =
  | "physical-pages-unavailable";
