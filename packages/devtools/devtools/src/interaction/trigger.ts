import type {
  QuireDevtoolsInteractionInput,
  QuireDevtoolsOperationTriggerSummary
} from "../types";

/**
 * Converts a browser interaction input into an operation trigger summary.
 *
 * @param input - Interaction input to summarize.
 * @returns Operation trigger summary.
 */
export function summarizeInteractionTrigger(
  input: QuireDevtoolsInteractionInput
): QuireDevtoolsOperationTriggerSummary {
  return {
    source: input.source,
    ...(input.label ? { label: input.label } : {}),
    ...(input.key ? { key: input.key } : {}),
    ...(input.inputType ? { inputType: input.inputType } : {}),
    ...(input.target ? { target: input.target } : {})
  };
}
