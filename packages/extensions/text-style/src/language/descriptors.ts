import { defineCommand, type CommandSpec } from "@quirekit/core";

/**
 * Describes marking the language of text, which spelling, grammar and hyphenation use. Language is not shown
 * in the document view: Word documents commonly mark every run with a language, and showing it would bury the text.
 * @param run - Command setting every language slot.
 * @returns Described command.
 */
export function describeSetLanguageCommand(run: CommandSpec): CommandSpec {
  return defineCommand({
    description: "Marks the language of `text` in the block (the whole block when `text` is left out) for spelling, grammar and hyphenation, as a language tag such as \"en-US\", \"zh-CN\" or \"fr-FR\".",
    target: "text",
    params: {
      type: "object",
      required: ["language"],
      properties: { language: { type: "string", pattern: "^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$" } },
      additionalProperties: false
    },
    // The command takes the language tag as its argument.
    adapt: (value, { range }) => range === null ? null : (value as { language: string }).language,
    run
  });
}

/**
 * Describes removing the language marking of text.
 * @param run - Command clearing every language slot.
 * @returns Described command.
 */
export function describeUnsetLanguageCommand(run: CommandSpec): CommandSpec {
  return defineCommand({
    description: "Removes the language marking of `text` in the block (the whole block when `text` is left out).",
    target: "text",
    run
  });
}
