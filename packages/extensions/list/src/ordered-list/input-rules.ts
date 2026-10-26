import {
  wrappingInputRule,
  type ExtendedRegExpMatchArray,
  type InputRule
} from "@quirekit/core";
import type { Node as PMNode } from "@quirekit/pm";

/** Matches an ordered list marker typed at the start of a textblock. */
export const orderedListInputRegex = /^(\d+)\.\s$/;

/** Options used to build ordered list input rules. */
export interface OrderedListInputRuleOptions {
  /** Node type name used for ordered list wrappers. */
  readonly nodeName: string;
  /** Whether active marks should be preserved. */
  readonly keepMarks: boolean;
  /** Whether active text-style attributes should be preserved. */
  readonly keepAttributes: boolean;
  /** Attribute reader used when keepAttributes is enabled. */
  readonly getTextStyleAttributes: () => Record<string, unknown>;
  /** Editor instance forwarded to the input rule when available. */
  readonly editor: Parameters<typeof wrappingInputRule>[0]["editor"];
}

/**
 * Creates Tiptap-compatible ordered list input rules.
 *
 * @param options - Input rule options resolved from the extension.
 * @returns Ordered list input rules.
 */
export function createOrderedListInputRules(
  options: OrderedListInputRuleOptions
): readonly InputRule[] {
  return [
    wrappingInputRule({
      find: orderedListInputRegex,
      type: options.nodeName,
      keepMarks: options.keepMarks,
      keepAttributes: options.keepAttributes,
      getAttributes: (match) => createOrderedListAttributes(match, options),
      joinPredicate: isSequentialOrderedList,
      editor: options.editor
    })
  ];
}

/**
 * Creates ordered-list attributes from the input rule match.
 *
 * @param match - Matched ordered-list marker.
 * @param options - Input rule options.
 * @returns Attributes for the created ordered list.
 */
function createOrderedListAttributes(
  match: ExtendedRegExpMatchArray,
  options: OrderedListInputRuleOptions
): Record<string, unknown> {
  return {
    start: Number(match[1]),
    ...(options.keepAttributes ? options.getTextStyleAttributes() : {})
  };
}

/**
 * Reports whether a new ordered list item should join the previous list.
 *
 * @param match - Matched ordered-list marker.
 * @param node - Previous ordered list node.
 * @returns Whether the list marker continues the previous list.
 */
function isSequentialOrderedList(
  match: ExtendedRegExpMatchArray,
  node: PMNode
): boolean {
  return node.childCount + Number(node.attrs.start ?? 1) === Number(match[1]);
}
