import type { QuireKitTheme } from "@quirekit/ui";
import type { SimpleMindMapOptions } from "@quirekit/mind-map-simple";

/** Framework-independent editor options; document writes remain host-owned. */
export interface MindEditorOptions extends Omit<SimpleMindMapOptions, "appearance"> {
  /** Public QuireKit theme; defaults to Precision light with the standard blue. */
  readonly theme?: QuireKitTheme;
}

export type { MindMapDialogOptions, MindMapDialogHandle, MindMapPreviewUpload, MindMapPreviewUploadContext } from "./runtime/dialog/types";
