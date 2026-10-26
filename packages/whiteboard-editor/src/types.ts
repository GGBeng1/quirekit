/// <reference path="./styles.d.ts" />
import type { QuireKitTheme } from "@quirekit/ui";
import type { WhiteboardEditRequest } from "@quirekit/whiteboard";
import type { WhiteboardDraftOptions } from "./draft/types";
/** Upload task for one preview image. */
export interface WhiteboardPreviewUploadContext {
  /** Aborted when the dialog closes. */ readonly signal: AbortSignal;
  /** Board title, usable as a file name. */ readonly name: string;
}
/** Host storage for preview PNGs. @returns Persistent `http(s)` or site-relative address. */
export type WhiteboardPreviewUpload = (image: Blob, context: WhiteboardPreviewUploadContext) => Promise<string>;
/** One host-owned modal editing task. */
export interface WhiteboardDialogOptions {
  /** Mapped host target and atomic commit. */ readonly request: WhiteboardEditRequest;
  /** Stable host identity enabling optional local recovery. */ readonly drafts?: WhiteboardDraftOptions | undefined;
  /** Mounted document, supporting independent windows. */ readonly ownerDocument: Document;
  /** Interface language for this independently mounted task; defaults to Chinese. */ readonly locale?: string;
  /** Host theme captured at task opening. */ readonly theme?: QuireKitTheme;
  /** Optional host lifetime. */ readonly signal?: AbortSignal;
  /** Lightweight title task that does not mount the drawing runtime. */ readonly mode?: "edit" | "rename";
  /** Stores the preview PNG and saves its address; omitted keeps the preview inline as base64. */ readonly uploadPreview?: WhiteboardPreviewUpload | undefined;
}
/** Disposable modal lifetime; the request is released exactly once. */
export interface WhiteboardDialogHandle {
  /** Cancels without committing document content. */ close(): void;
}
