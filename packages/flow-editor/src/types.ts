import type { FlowLibraryStore } from "./library/types";
import type { QuireKitTheme } from "@quirekit/ui";
import type { FlowchartEditorOptions } from "@quirekit/flowchart-x6";
import type { FlowchartEditRequest } from "@quirekit/flowchart";
/** Shared product options; document persistence stays with the host. */
export interface FlowEditorOptions extends Omit<FlowchartEditorOptions, "appearance"> {
  /** Theme shared by controls and graph shapes. */ readonly theme?: QuireKitTheme;
}
/** Upload task for one preview image. */
export interface FlowchartPreviewUploadContext {
  /** Aborted when the dialog closes. */ readonly signal: AbortSignal;
  /** Diagram title, usable as a file name. */ readonly name: string;
}
/** Host storage for preview PNGs. @returns Persistent `http(s)` or site-relative address. */
export type FlowchartPreviewUpload = (image: Blob, context: FlowchartPreviewUploadContext) => Promise<string>;
/** One host-owned authoring task with an atomic target. */
export interface FlowchartDialogOptions {
  /** Interface language inherited from the host; independent dialogs own their provider. */ readonly locale?: string;
  /** Shared library service; omitted uses same-origin local storage. */ readonly libraryStore?: FlowLibraryStore | undefined;
  /** Mapped source and synchronous commit authority. */ readonly request: FlowchartEditRequest;
  /** Owning browser document. */ readonly ownerDocument: Document;
  /** Current product theme. */ readonly theme?: QuireKitTheme;
  /** Optional host lifetime. */ readonly signal?: AbortSignal;
  /** Stores the preview PNG and saves its address; omitted keeps the preview inline as base64. */ readonly uploadPreview?: FlowchartPreviewUpload | undefined;
}
/** Idempotent task cancellation, also valid before lazy loading finishes. */
export interface FlowchartDialogHandle {
  /** Closes the draft without saving. */ close(): void;
}
