import type { MindMapDocument } from "../model/types";
import type { MindMapCommitResult } from "../draft/types";

/** Inline PNG generated from the saved mind map. */
export interface MindMapInlinePreview {
  /** Self-contained PNG bytes. */ readonly dataUrl: string;
  /** Absent for the inline form. */ readonly url?: never;
  /** Intrinsic pixel width, independent of document layout. */ readonly width: number;
  /** Intrinsic pixel height. */ readonly height: number;
}
/** The same PNG stored by the host, referenced by address. */
export interface MindMapLinkedPreview {
  /** `http(s)` or site-relative address returned by the host upload. */ readonly url: string;
  /** Absent for the linked form. */ readonly dataUrl?: never;
  /** Intrinsic pixel width, independent of document layout. */ readonly width: number;
  /** Intrinsic pixel height. */ readonly height: number;
}
/** Static preview, inline or stored by the host; never executable content. */
export type MindMapPreview = MindMapInlinePreview | MindMapLinkedPreview;
/** Portable object shared by PM documents and Markdown fences. */
export interface MindMapEmbed {
  /** Host envelope discriminator, distinct from the mind map protocol. */ readonly type: "quirekit-mind-map-embed";
  /** Envelope schema version: 2 when the preview is linked, otherwise 1 for older readers. */ readonly version: 1 | 2;
  /** Stable object identity within a host document. */ readonly id: string;
  /** Plain accessible title. */ readonly title: string;
  /** Sole mind map and revision authority. */ readonly document: MindMapDocument;
  /** Frozen static preview; null before the first save. */ readonly preview: MindMapPreview | null;
}
/** A PNG prepared from one exact source-bound vector snapshot. */
export interface MindMapRasterSnapshot extends Omit<MindMapInlinePreview, "url"> {
  /** Exact serialized draft mind map, before the host revision is incremented. */ readonly source: string;
}
/** Host-owned mapped target with final synchronous acceptance. */
export interface MindMapEditRequest {
  /** Explicit mapped task intent; legacy/custom hosts may omit it and use an existing-object slot. */ readonly intent?: "insert" | "edit";
  /** Detached initial envelope. */ readonly document: MindMapEmbed;
  /** @param document - Complete source and matching preview. @returns Atomic acceptance result. */
  readonly commit: (document: MindMapEmbed) => MindMapCommitResult;
  /** Releases the target and restores focus without changing source. */ readonly release: () => void;
}
