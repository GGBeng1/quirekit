import type { CommandSpec, CommandProps } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import { resolveWordParagraphFormatting } from "../model";
import { collectSelectedWordParagraphs } from "../selection/collect";
import type {
  WordParagraphFormatting,
  WordParagraphFormattingPatch
} from "../types";
import type { SetWordParagraphPropertiesOptions } from "./types";
import { isSetWordParagraphPropertiesOptions } from "./validation";

/**
 * Creates the general selection-aware Word paragraph property command.
 *
 * @param paragraphNodeNames - Textblock node names that own Word paragraph attrs.
 * @returns Command that applies one validated patch to every covered paragraph.
 */
export function createSetWordParagraphPropertiesCommand(
  paragraphNodeNames: readonly string[]
): CommandSpec {
  return (value) => (context) => {
    if (!isSetWordParagraphPropertiesOptions(value)) return false;
    if ((value.properties.eastAsianLayout !== undefined || value.properties.documentGrid !== undefined) && !context.editor.isEditable) return false;
    return setProperties(context, paragraphNodeNames, value);
  };
}

/**
 * Applies one canonical property patch without replacing preservation metadata.
 *
 * @param context - Active editor command context.
 * @param paragraphNodeNames - Registered paragraph-like textblocks.
 * @param options - Validated first-class property patch.
 * @returns Whether one changed transaction was dispatched.
 */
function setProperties(
  context: CommandProps,
  paragraphNodeNames: readonly string[],
  options: SetWordParagraphPropertiesOptions
): boolean {
  const targets = collectSelectedWordParagraphs(context.state, paragraphNodeNames);
  let changed = false;

  for (const target of targets) {
    const formatting = resolveWordParagraphFormatting(
      target.node.attrs.wordParagraph
    );
    const nextFormatting = applyFormattingPatch(formatting, options.properties);
    if (JSON.stringify(nextFormatting) === JSON.stringify(formatting)) continue;
    context.tr.setNodeMarkup(target.position, undefined, {
      ...target.node.attrs,
      wordParagraph: nextFormatting
    });
    changed = true;
  }

  if (!changed) return false;
  // Independent switches must also respect filters during can(), not only dispatch.
  if ((options.properties.eastAsianLayout !== undefined || options.properties.documentGrid !== undefined) && !context.editor.state.pm.filterTransaction(context.tr)) {
    context.tr.setMeta("preventDispatch", true); return false;
  }
  // Explicit format choices are separate intents even inside PM's typing window.
  if (options.properties.alignment !== undefined || options.properties.outlineLevel !== undefined || options.properties.eastAsianLayout !== undefined || options.properties.documentGrid !== undefined) {
    closeHistory(context.tr);
  }
  context.dispatch?.(context.tr.scrollIntoView());
  return true;
}

/**
 * Merges a validated patch into one canonical paragraph-formatting value.
 *
 * @param formatting - Existing canonical paragraph formatting.
 * @param patch - Validated first-class field patch.
 * @returns Updated formatting with source preservation retained.
 */
function applyFormattingPatch(
  formatting: WordParagraphFormatting,
  patch: WordParagraphFormattingPatch
): WordParagraphFormatting {
  return {
    ...formatting,
    ...(patch.styleId !== undefined ? { styleId: patch.styleId } : {}),
    ...(patch.outlineLevel !== undefined
      ? { outlineLevel: patch.outlineLevel }
      : {}),
    ...(patch.alignment !== undefined ? { alignment: patch.alignment } : {}),
    ...(patch.direction !== undefined ? { direction: patch.direction } : {}),
    ...(patch.indentation !== undefined
      ? { indentation: patch.indentation }
      : {}),
    ...(patch.tabs !== undefined ? { tabs: patch.tabs } : {}),
    ...(patch.spacing !== undefined ? { spacing: patch.spacing } : {}),
    ...(patch.pagination !== undefined
      ? { pagination: patch.pagination }
      : {}),
    ...(patch.documentGrid !== undefined
      ? { documentGrid: { ...formatting.documentGrid, ...patch.documentGrid } }
      : {}),
    ...(patch.eastAsianLayout !== undefined
      ? { eastAsianLayout: { ...formatting.eastAsianLayout, ...patch.eastAsianLayout } }
      : {}),
    ...(patch.borders !== undefined ? { borders: patch.borders } : {}),
    ...(patch.shading !== undefined ? { shading: patch.shading } : {}),
    ...(patch.markFormatting !== undefined
      ? { markFormatting: patch.markFormatting }
      : {})
  };
}
