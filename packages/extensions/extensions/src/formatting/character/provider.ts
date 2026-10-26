import type { FormattingOptions, QuireFormattingProvider } from "../types";
import { applyCharacterFormatting } from "./apply";
import {
  captureCharacterFormatting,
  createEmptyCharacterSnapshot,
  readSourceMarks
} from "./snapshot";
import type { CharacterFormattingSnapshot } from "./types";

/**
 * Creates the schema-generic direct-character formatting provider.
 *
 * @param options - Semantic marks and textStyle fields that formatting tools preserve.
 * @returns Character provider sharing one root transaction with domain providers.
 */
export function createCharacterFormattingProvider(
  options: FormattingOptions
): QuireFormattingProvider {
  const preservedMarks = new Set(options.preservedMarks);
  const preservedTextStyleAttributes = new Set(
    options.preservedTextStyleAttributes
  );

  return {
    id: "quirekit.character-formatting",
    order: 100,
    capture: context => captureCharacterFormatting(
      context,
      readSourceMarks(
        context.state.doc,
        context.selection.from,
        context.selection.empty,
        context.selection.$from.marks()
      ),
      preservedMarks,
      preservedTextStyleAttributes
    ),
    apply: (context, value) => applyCharacterFormatting(
      context,
      value as CharacterFormattingSnapshot,
      preservedMarks,
      preservedTextStyleAttributes
    ),
    clear: context => applyCharacterFormatting(
      context,
      createEmptyCharacterSnapshot(context.state.schema.marks, preservedMarks),
      preservedMarks,
      preservedTextStyleAttributes
    )
  };
}
