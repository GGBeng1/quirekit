import type { CommandSpec, CommandProps } from "@quirekit/core";
import {
  defaultWordParagraphCharacterPitchTwips,
  resolveWordParagraphFormatting
} from "../model";
import { collectSelectedWordParagraphs } from "../selection/collect";
import type {
  AdjustWordParagraphIndentationDirection,
  SetWordParagraphIndentationOptions
} from "./types";
import { isSetWordParagraphIndentationOptions } from "./validation";

/**
 * Creates the multi-paragraph indentation command.
 *
 * @param paragraphNodeNames - Textblock node names that own Word paragraph attrs.
 * @returns Command that updates covered paragraphs in one transaction.
 */
export function createSetWordParagraphIndentationCommand(
  paragraphNodeNames: readonly string[]
): CommandSpec {
  return (value) => (context) => {
    if (!isSetWordParagraphIndentationOptions(value)) return false;
    return setIndentation(context, paragraphNodeNames, value);
  };
}

/** One WPS-style paragraph-indent step expressed in character-relative units. */
export const defaultWordParagraphIndentStepCharacters = 200;

/**
 * Creates a selection-aware paragraph-indent step command.
 *
 * The command targets every configured paragraph-like textblock, so ordinary
 * paragraphs and headings share the same semantics. Numbered selections may
 * choose list-level commands at the product layer before reaching this command.
 *
 * @param paragraphNodeNames - Textblock node names that own Word paragraph attrs.
 * @param direction - Whether logical start indentation increases or decreases.
 * @returns Command that updates covered textblocks in one transaction.
 */
export function createAdjustWordParagraphIndentationCommand(
  paragraphNodeNames: readonly string[],
  direction: AdjustWordParagraphIndentationDirection
): CommandSpec {
  return () => (context) => {
    const targets = collectSelectedWordParagraphs(context.state, paragraphNodeNames);
    let changed = false;

    for (const target of targets) {
      const formatting = resolveWordParagraphFormatting(
        target.node.attrs.wordParagraph
      );
      const start = formatting.indentation.start;
      const currentValue = start?.value ?? 0;
      const step = start?.unit === "dxa"
        ? defaultWordParagraphIndentStepCharacters / 100
          * defaultWordParagraphCharacterPitchTwips
        : defaultWordParagraphIndentStepCharacters;
      const nextValue = Math.max(
        0,
        currentValue + (direction === "increase" ? step : -step)
      );
      if (nextValue === currentValue) continue;
      const nextStart = {
        unit: start?.unit ?? "character",
        value: Math.round(nextValue)
      } as const;
      context.tr.setNodeMarkup(target.position, undefined, {
        ...target.node.attrs,
        wordParagraph: {
          ...formatting,
          indentation: {
            ...formatting.indentation,
            start: nextStart
          }
        }
      });
      changed = true;
    }

    if (!changed) return false;
    context.dispatch?.(context.tr.scrollIntoView());
    return true;
  };
}

/**
 * Applies one complete indentation target to every selected paragraph.
 *
 * @param context - Active editor command context.
 * @param paragraphNodeNames - Registered paragraph-like textblocks.
 * @param options - Validated complete indentation target.
 * @returns Whether one changed transaction was dispatched.
 */
function setIndentation(
  context: CommandProps,
  paragraphNodeNames: readonly string[],
  options: SetWordParagraphIndentationOptions
): boolean {
  const targets = collectSelectedWordParagraphs(context.state, paragraphNodeNames);
  let changed = false;
  const targetSignature = JSON.stringify(options.indentation);

  for (const target of targets) {
    const formatting = resolveWordParagraphFormatting(
      target.node.attrs.wordParagraph
    );
    if (JSON.stringify(formatting.indentation) === targetSignature) continue;
    context.tr.setNodeMarkup(target.position, undefined, {
      ...target.node.attrs,
      wordParagraph: {
        ...formatting,
        indentation: options.indentation
      }
    });
    changed = true;
  }

  if (!changed) return false;
  context.dispatch?.(context.tr);
  return true;
}
