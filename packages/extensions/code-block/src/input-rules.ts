import { textblockTypeInputRule, type InputRule } from "@quirekit/core";

/** Matches a fenced code block opened with backticks. */
export const backtickInputRegex = /^```([a-z]+)?[\s\n]$/;

/** Matches a fenced code block opened with tildes. */
export const tildeInputRegex = /^~~~([a-z]+)?[\s\n]$/;

/**
 * Creates input rules that convert Markdown fences into code blocks.
 *
 * @param nodeName - Code block node name.
 * @returns Input rules for backtick and tilde fences.
 */
export function createCodeBlockInputRules(nodeName: string): readonly InputRule[] {
  return [
    textblockTypeInputRule({
      find: backtickInputRegex,
      type: nodeName,
      getAttributes: (match) => ({ language: match[1] })
    }),
    textblockTypeInputRule({
      find: tildeInputRegex,
      type: nodeName,
      getAttributes: (match) => ({ language: match[1] })
    })
  ];
}
