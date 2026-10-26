import type { FlowchartDocument } from "../model/types";
import type { FlowchartCommitResult } from "../draft/types";

/** Inline PNG generated from the saved graph. */
export interface FlowchartInlinePreview {
  /** Self-contained PNG bytes. */ readonly dataUrl: string;
  /** Absent for the inline form. */ readonly url?: never;
  /** Intrinsic pixel width, independent of document layout. */ readonly width: number;
  /** Intrinsic pixel height. */ readonly height: number;
}
/** The same PNG stored by the host, referenced by address. */
export interface FlowchartLinkedPreview {
  /** `http(s)` or site-relative address returned by the host upload. */ readonly url: string;
  /** Absent for the linked form. */ readonly dataUrl?: never;
  /** Intrinsic pixel width, independent of document layout. */ readonly width: number;
  /** Intrinsic pixel height. */ readonly height: number;
}
/** Static preview, inline or stored by the host; never executable content. */
export type FlowchartPreview = FlowchartInlinePreview | FlowchartLinkedPreview;

/** Portable object shared by PM documents and Markdown fences. */
export interface FlowchartEmbed {
  /** Host envelope discriminator, distinct from the graph protocol. */ readonly type: "quirekit-flowchart-embed";
  /** Envelope schema version: 2 when the preview is linked, otherwise 1 for older readers. */ readonly version: 1 | 2;
  /** Stable object identity within a host document. */ readonly id: string;
  /** Plain accessible title. */ readonly title: string;
  /** Sole graph and revision authority. */ readonly document: FlowchartDocument;
  /** Frozen static preview; null before the first save. */ readonly preview: FlowchartPreview | null;
}
/** A PNG prepared from one exact source-bound vector snapshot. */
export interface FlowchartRasterSnapshot extends Omit<FlowchartInlinePreview, "url"> {
  /** Exact serialized draft graph, before the host revision is incremented. */ readonly source: string;
}
/** Host-owned mapped target with final synchronous acceptance. */
export interface FlowchartEditRequest {
  /** Detached initial envelope. */ readonly document: FlowchartEmbed;
  /** @param document - Complete source and matching preview. @returns Atomic acceptance result. */
  readonly commit: (document: FlowchartEmbed) => FlowchartCommitResult;
  /** Releases the target and restores focus without changing source. */ readonly release: () => void;
}
