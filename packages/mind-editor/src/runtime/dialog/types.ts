import type { QuireKitTheme } from "@quirekit/ui";
import type { MindMapEditRequest } from "@quirekit/mind-map";
import type { MindEditorRecoveryOptions } from "../../recovery/types";

/** Upload task for one preview image. */
export interface MindMapPreviewUploadContext {
  /** Aborted when the dialog closes. */ readonly signal: AbortSignal;
  /** Diagram title, usable as a file name. */ readonly name: string;
}
/** Host storage for preview PNGs. @returns Persistent `http(s)` or site-relative address. */
export type MindMapPreviewUpload = (image: Blob, context: MindMapPreviewUploadContext) => Promise<string>;
/** One host-owned authoring task, independent of the host's document framework. */
export interface MindMapDialogOptions {
  /** Explicit stable local draft scope; omitted disables recovery and storage access. */ readonly recovery?: MindEditorRecoveryOptions | undefined;
  /** Captured source and synchronous commit authority. */ readonly request: MindMapEditRequest;
  /** Browser document owning the task and its resources. */ readonly ownerDocument: Document;
  /** Theme shared with the surrounding product. */ readonly theme?: QuireKitTheme;
  /** Interface locale captured from the owning product. Defaults to zh-CN. */ readonly locale?: string;
  /** Host lifetime; abort cancels without saving. */ readonly signal?: AbortSignal;
  /** Stores the preview PNG and saves its address; omitted keeps the preview inline as base64. */ readonly uploadPreview?: MindMapPreviewUpload | undefined;
}

/** Idempotent cancellation, including while the workbench is loading. */
export interface MindMapDialogHandle {
  /** Releases the task without changing the host document. */ close(): void;
}
