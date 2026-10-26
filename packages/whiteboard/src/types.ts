/** Portable JSON values; runtime objects and callbacks never enter a document. */
export type WhiteboardJson = null | boolean | number | string | readonly WhiteboardJson[] | { readonly [key: string]: WhiteboardJson };
/** Versioned native scene, kept independent of the rendering dependency. */
export interface WhiteboardScene {
  /** Upstream file discriminator. */ readonly type: "excalidraw";
  /** Upstream serialization version. */ readonly version: 2;
  /** Original producer attribution. */ readonly source: string;
  /** Native editable objects, including bindings and text. */ readonly elements: readonly Readonly<Record<string, WhiteboardJson>>[];
  /** Only persisted upstream preferences, never selection or collaboration state. */ readonly appState: Readonly<Record<string, WhiteboardJson>>;
  /** Self-contained raster image files indexed by their upstream identity. */ readonly files: Readonly<Record<string, WhiteboardJson>>;
}
/** Inline PNG generated from the exact saved scene. */
export interface WhiteboardInlinePreview {
  /** Safe PNG data URL, not executable SVG. */ readonly dataUrl: string;
  /** Absent for the inline form. */ readonly url?: never;
  /** Intrinsic pixel width. */ readonly width: number;
  /** Intrinsic pixel height. */ readonly height: number;
}
/** The same PNG stored by the host, referenced by address. */
export interface WhiteboardLinkedPreview {
  /** `http(s)` or site-relative address returned by the host upload. */ readonly url: string;
  /** Absent for the linked form. */ readonly dataUrl?: never;
  /** Intrinsic pixel width. */ readonly width: number;
  /** Intrinsic pixel height. */ readonly height: number;
}
/** Static representation of the saved scene, inline or stored by the host. */
export type WhiteboardPreview = WhiteboardInlinePreview | WhiteboardLinkedPreview;
/** Source authority shared by the three host editors. */
export interface WhiteboardDocument {
  /** Envelope discriminator. */ readonly type: "quirekit-whiteboard";
  /** Envelope schema version: 2 when the preview is linked, otherwise 1 for older readers. */ readonly version: 1 | 2;
  /** Stable identity within a host document. */ readonly id: string;
  /** Monotonic successful-save count. */ readonly revision: number;
  /** User-facing plain text. */ readonly title: string;
  /** Editable native scene. */ readonly scene: WhiteboardScene;
  /** Source-bound static image; absent for a newly created empty board. */ readonly preview: WhiteboardPreview | null;
}
/** Failure preserves the open draft rather than overwriting a changed host. */
export type WhiteboardCommitResult = "saved" | "conflict" | "readonly" | "missing";
/** Host validates identity, permission and baseline atomically, after snapshot preparation. */
export interface WhiteboardEditRequest {
  /** Detached initial source. */ readonly document: WhiteboardDocument;
  /** Ephemeral task intent; absent means editing an existing board. */ readonly intent?: "insert" | "edit";
  /** @param document - Complete source and matching preview. @returns Atomic acceptance result. */
  readonly commit: (document: WhiteboardDocument) => WhiteboardCommitResult;
  /** Releases mapped targets and restores host focus without writing content. */ readonly release: () => void;
}
