import { createChainableState, type CommandSpec, type CommandProps } from "@quirekit/core";
import {
  collectSelectedWordParagraphs,
  resolveWordParagraphFormatting
} from "@quirekit/classic-paragraph-model";
import { resolveWordParagraphStyleRegistry } from "../model";
import type { ApplyWordParagraphStyleOptions } from "./types";
import { isApplyWordParagraphStyleOptions } from "./validation";

/**
 * Creates the selection-aware named paragraph style command.
 *
 * @param paragraphNodeNames - Textblock node names that own Word formatting.
 * @returns Command that applies one existing named style to covered paragraphs.
 */
export function createApplyWordParagraphStyleCommand(
  paragraphNodeNames: readonly string[]
): CommandSpec {
  return (value) => (context) => {
    if (!context.editor.isEditable || !isApplyWordParagraphStyleOptions(value)) return false;
    return applyStyle(context, paragraphNodeNames, value);
  };
}

/**
 * Applies one style identifier without clearing unrelated direct formatting.
 *
 * Direct outline metadata is cleared because outline semantics now come from
 * the named style. Other direct formatting remains authoritative over style
 * inheritance, matching Word's paragraph-style behavior.
 *
 * @param context - Active editor command context.
 * @param paragraphNodeNames - Registered paragraph-like textblocks.
 * @param options - Validated style application options.
 * @returns Whether one changed transaction was dispatched.
 */
function applyStyle(
  context: CommandProps,
  paragraphNodeNames: readonly string[],
  options: ApplyWordParagraphStyleOptions
): boolean {
  const registry = resolveWordParagraphStyleRegistry(
    context.tr.doc.attrs.wordStyleRegistry
  );
  if (registry.styles[options.styleId] === undefined) return false;
  const targets = collectSelectedWordParagraphs(
    createChainableState({ state: context.state, transaction: context.tr }),
    paragraphNodeNames
  );
  let changed = false;

  for (const target of targets) {
    const formatting = resolveWordParagraphFormatting(
      target.node.attrs.wordParagraph
    );
    if (
      formatting.styleId === options.styleId
      && formatting.outlineLevel === null
    ) continue;
    context.tr.setNodeMarkup(target.position, undefined, {
      ...target.node.attrs,
      wordParagraph: {
        ...formatting,
        styleId: options.styleId,
        outlineLevel: null
      }
    });
    changed = true;
  }

  if (!changed) return false;
  context.dispatch?.(context.tr.scrollIntoView());
  return true;
}
