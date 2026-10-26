import { closeHistory } from "@quirekit/pm";
import type { CommandSpec, CommandProps } from "@quirekit/core";
import { resolveWordParagraphFormatting } from "../model";
import { collectSelectedWordParagraphs } from "../selection/collect";
import type {
  SetWordParagraphLineSpacingOptions,
  SetWordParagraphSpacingOptions
} from "./types";
import {
  isSetWordParagraphLineSpacingOptions,
  isSetWordParagraphSpacingOptions
} from "./validation";

/**
 * Creates the complete paragraph-spacing command.
 *
 * @param paragraphNodeNames - Textblock node names owning Word paragraph attrs.
 * @returns Selection-aware spacing command.
 */
export function createSetWordParagraphSpacingCommand(
  paragraphNodeNames: readonly string[]
): CommandSpec {
  return (value) => (context) => {
    if (!isSetWordParagraphSpacingOptions(value)) return false;
    return setSpacing(context, paragraphNodeNames, value);
  };
}

/**
 * Creates a line-only spacing command that preserves before/after values.
 *
 * @param paragraphNodeNames - Textblock node names owning Word paragraph attrs.
 * @returns Selection-aware line-spacing command.
 */
export function createSetWordParagraphLineSpacingCommand(
  paragraphNodeNames: readonly string[]
): CommandSpec {
  return (value) => (context) => {
    if (!isSetWordParagraphLineSpacingOptions(value)) return false;
    return setLineSpacing(context, paragraphNodeNames, value);
  };
}

/**
 * Applies complete spacing to all selected paragraph-like nodes.
 *
 * @param context - Active command context.
 * @param paragraphNodeNames - Registered paragraph-like node names.
 * @param options - Validated complete spacing.
 * @returns Whether a transaction changed the document.
 */
function setSpacing(
  context: CommandProps,
  paragraphNodeNames: readonly string[],
  options: SetWordParagraphSpacingOptions
): boolean {
  const targetSignature = JSON.stringify(options.spacing);
  return updateSelectedSpacing(context, paragraphNodeNames, (current) => (
    JSON.stringify(current) === targetSignature ? current : options.spacing
  ));
}

/**
 * Applies only the line-spacing field to selected paragraph-like nodes.
 *
 * @param context - Active command context.
 * @param paragraphNodeNames - Registered paragraph-like node names.
 * @param options - Validated line-spacing update.
 * @returns Whether a transaction changed the document.
 */
function setLineSpacing(
  context: CommandProps,
  paragraphNodeNames: readonly string[],
  options: SetWordParagraphLineSpacingOptions
): boolean {
  const targetSignature = JSON.stringify(options.line);
  return updateSelectedSpacing(context, paragraphNodeNames, (current) => (
    JSON.stringify(current.line) === targetSignature
      ? current
      : { ...current, line: options.line }
  ));
}

/**
 * Updates selected paragraph spacing in one collaboration-safe transaction.
 *
 * @param context - Active command context.
 * @param paragraphNodeNames - Registered paragraph-like node names.
 * @param resolveNext - Pure resolver for one paragraph's next spacing.
 * @param separateHistory - Whether this explicit intent starts a fresh undo group.
 * @returns Whether a transaction changed the document.
 */
export function updateSelectedSpacing(
  context: CommandProps,
  paragraphNodeNames: readonly string[],
  resolveNext: (
    current: ReturnType<typeof resolveWordParagraphFormatting>["spacing"]
  ) => ReturnType<typeof resolveWordParagraphFormatting>["spacing"],
  separateHistory = false
): boolean {
  const targets = collectSelectedWordParagraphs(context.state, paragraphNodeNames);
  let changed = false;

  for (const target of targets) {
    const formatting = resolveWordParagraphFormatting(
      target.node.attrs.wordParagraph
    );
    const spacing = resolveNext(formatting.spacing);
    if (spacing === formatting.spacing) continue;
    context.tr.setNodeMarkup(target.position, undefined, {
      ...target.node.attrs,
      wordParagraph: { ...formatting, spacing }
    });
    changed = true;
  }

  if (!changed) return false;
  if (separateHistory) closeHistory(context.tr);
  context.dispatch?.(context.tr);
  return true;
}
