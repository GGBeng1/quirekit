import { getValueType, previewValue } from "./preview";
import type { QuireDevtoolsOperationMetaSummary } from "../types";

/**
 * Summarizes one metadata value.
 *
 * @param key - Metadata key.
 * @param value - Metadata value.
 * @returns Metadata summary.
 */
export function summarizeTransactionMeta(
  key: string,
  value: unknown
): QuireDevtoolsOperationMetaSummary {
  return {
    key,
    valueType: getValueType(value),
    preview: previewValue(value)
  };
}
