import type { MindMapDocument, MindMapFloatingTopic, MindMapPoint } from "../model/types";
import type { MindMapNodeStyle } from "../formatting/types";
import type { MindMapNode } from "../model/types";

/** A conversion difference that callers can present or reject before saving. */
export interface XmindDiagnostic {
  /** Whether data is unsupported, defaulted, or the diagnostic list was capped. */
  readonly code: "unsupported-field" | "fallback" | "diagnostics-truncated";
  /** Exact location within the imported workbook, independent of generated node IDs. */
  readonly path: string;
  /** Human-readable explanation of the conversion difference. */
  readonly message: string;
}

/** One independently editable XMind canvas. */
export interface XmindSheet {
  /** Source sheet identity, or a deterministic fallback when absent. */
  readonly id: string;
  /** Source canvas title, or its root topic text when absent. */
  readonly title: string;
  /** Editable QuireKit source with fresh document-local node IDs. */
  readonly document: MindMapDocument;
}

/** All canvases and explicit conversion differences; no sheet is silently discarded. */
export interface XmindImportResult {
  /** Ordered canvases; the host chooses which document to mount. */
  readonly sheets: readonly XmindSheet[];
  /** Unsupported fields and defaults applied during conversion. */
  readonly diagnostics: readonly XmindDiagnostic[];
}

/** Optional detached resources; no converter performs network or filesystem access. */
export interface XmindImportOptions {
  /** @param path - Validated relative resources path. @returns Bounded PNG bytes or undefined. */
  readonly readResource?: (path: string) => Uint8Array | undefined;
}

/** Interoperable workbook projection with explicit differences. */
export interface XmindExportResult {
  /** Modern content.json sheet array. */ readonly content: readonly Readonly<Record<string, unknown>>[];
  /** Bounded embedded resources addressed by content.json. */ readonly resources: ReadonlyMap<string, Uint8Array>;
  /** Content that cannot be represented by this XMind projection. */ readonly diagnostics: readonly XmindDiagnostic[];
}

/** Modern .xmind bytes and conversion differences. */
export interface XmindFileExport {
  /** ZIP archive suitable for saving as .xmind. */ readonly bytes: Uint8Array;
  /** Differences retained from content projection. */ readonly diagnostics: readonly XmindDiagnostic[];
}

/** Shared resource budget for an entire workbook conversion. */
export interface XmindContext {
  /** Records already visited, to reject cycles and aliases. */ readonly seen: WeakSet<object>;
  /** Number of topics visited across all canvases. */ count: number;
  /** Total UTF-16 topic text length. */ textSize: number;
  /** Collected bounded conversion differences. */ readonly diagnostics: XmindDiagnostic[];
}

/** Canvas-local ownership of independent trees and source coordinate projection. */
export interface XmindCanvas {
  /** Absolute source root anchor, subtracted from independent topic anchors. */ readonly origin: MindMapPoint;
  /** Independent trees accumulated while traversing this sheet. */ readonly floatingTopics: MindMapFloatingTopic[];
  /** Original-to-canonical references, scoped to this canvas. */ readonly ids: Map<string, string>;
  /** Topic role styles already projected once. */ readonly theme: ReadonlyMap<string, MindMapNodeStyle>;
  /** Group ranges awaiting complete child identity allocation. */ readonly groups: { /** Source owner. */ readonly source: Record<string, unknown>; /** Canonical owner. */ readonly node: MindMapNode; /** Field path. */ readonly path: string }[];
  /** Explicit caller resource boundary. */ readonly resources: XmindImportOptions;
}
