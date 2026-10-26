import type { QuireKitChoicePickerProps, QuireKitChoiceSubmitRequest } from "../../components/choice-picker/types";
import type { QuireKitTaskCancelReason, QuireKitTaskSearchRequest } from "../../components/task/types";

/** Vue materializes omitted optional fields; normalize only the private runtime boundary. */
export type ChoicePickerRuntimeProps = Pick<QuireKitChoicePickerProps, "title" | "items"> & {
  readonly [Key in keyof QuireKitChoicePickerProps]?: QuireKitChoicePickerProps[Key] | undefined;
};

/** Sole public notification owner for the adaptive choice task. */
export interface ChoicePickerEvents {
  /** @param value - Requested open state. */
  updateOpen(value: boolean): void;
  /** @param value - Actual session visibility. */
  openChange(value: boolean): void;
  /** @param details - Discarded session identity and cause. */
  cancel(details: { readonly reason: QuireKitTaskCancelReason; readonly sessionId: string }): void;
  /** @param value - Successfully submitted value requested from the host. */
  updateValue(value: readonly string[]): void;
  /** @param request - Successfully completed business submission. */
  commit(request: QuireKitChoiceSubmitRequest): void;
  /** @param details - Current submission rejection. */
  error(details: { readonly error: unknown; readonly request: QuireKitChoiceSubmitRequest }): void;
  /** @param value - Complete query requested by the input. */
  updateQuery(value: string): void;
  /** @param request - Latest independently cancellable query. */
  search(request: QuireKitTaskSearchRequest): void;
}
