import type { FlowExportRequest } from "../export/types";
/** Frozen page task, canceled at close intent before the popup fade-out ends. */
export interface FlowPageRequest extends FlowExportRequest {
  /** Source/permission/close lifetime for print preparation. */ readonly signal: AbortSignal;
}
