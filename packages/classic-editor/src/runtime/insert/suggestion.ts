import type { ClassicEditorActionDefinition } from "../../types";
import type {
  ClassicEditorInsertItemDefinition,
  ClassicEditorInsertSuggestionItemInput
} from "../../types/insert";

/**
 * Projects existing command-neutral Suggestion facts into Insert discovery.
 *
 * The returned item retains the exact action object carried by the provider;
 * acceptance never routes through the result id or a string command name.
 *
 * @param input - Suggestion result and Insert presentation metadata.
 * @returns Typed Insert item using the same canonical action closure.
 */
export function createClassicEditorInsertItemFromSuggestion(
  input: ClassicEditorInsertSuggestionItemInput
): ClassicEditorInsertItemDefinition {
  const { result, projection } = input;
  const action: ClassicEditorActionDefinition = result.action;
  return Object.freeze({
    id: result.id,
    group: projection.group,
    action,
    description: projection.description,
    presentation: projection.presentation,
    preview: projection.preview,
    capability: projection.capability,
    keywords: Object.freeze([
      result.label,
      ...(result.keywords ?? [])
    ])
  });
}
