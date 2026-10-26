import type { QuireKitTheme } from "@quirekit/ui";
import type { TextDiagramEditRequest } from "@quirekit/text-diagram";
/** One independent host-owned text diagram task. */
export interface TextDiagramDialogOptions {
  /** Initial source and final atomic commit owner. */ readonly request: TextDiagramEditRequest;
  /** Browser document owning the overlay. */ readonly ownerDocument: Document;
  /** Host interface language. */ readonly locale?: string;
  /** Host theme, independent of persisted preview appearance. */ readonly theme?: QuireKitTheme;
  /** Host lifetime. */ readonly signal?: AbortSignal;
}
/** Safe before or after lazy dialog mounting. */
export interface TextDiagramDialogHandle {
  /** Cancels and releases without saving. */ close(): void;
}
