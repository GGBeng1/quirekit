import type { QuireKitPresetSubmitRequest } from "../../components/preset-picker/types";
import type { QuireKitTaskCancelReason } from "../../components/task/types";

/** Single-value notification boundary around the shared selection task. */
export interface PresetPickerEvents {
  /** @param value - Requested controlled open state. */
  updateOpen(value: boolean): void;
  /** @param value - Effective task visibility. */
  openChange(value: boolean): void;
  /** @param details - Discarded session and its reason. */
  cancel(details: { readonly reason: QuireKitTaskCancelReason; readonly sessionId: string }): void;
  /** @param value - Successfully submitted single-value model request. */
  updateValue(value: string | null): void;
  /** @param request - Successfully submitted preset snapshot. */
  commit(request: QuireKitPresetSubmitRequest): void;
  /** @param details - Current business failure and the original submitted snapshot. */
  error(details: { readonly error: unknown; readonly request: QuireKitPresetSubmitRequest }): void;
}
