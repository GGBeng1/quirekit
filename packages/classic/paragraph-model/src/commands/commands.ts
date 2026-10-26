import { defineCommand, type AnyCommands } from "@quirekit/core";
import {
  createAdjustWordParagraphIndentationCommand,
  createSetWordParagraphIndentationCommand
} from "./indentation";
import {
  createSetWordParagraphLineSpacingCommand,
  createSetWordParagraphSpacingCommand
} from "./spacing";
import { createSetWordParagraphSpacingSideCommand } from "./spacing-side";
import { createSetWordParagraphPropertiesCommand } from "./properties";
import { createInsertWordColumnBreakCommand, createInsertWordPageBreakCommand, describeWordBreakCommand } from "./page-break";
import { createInsertWordBlankPageCommand } from "./blank-page";
import type { WordHeadingAttributes } from "../word-heading";
import type {
  SetWordParagraphIndentationOptions,
  SetWordParagraphLineSpacingOptions,
  SetWordParagraphPropertiesOptions,
  SetWordParagraphSpacingOptions,
  SetWordParagraphSpacingSideOptions
} from "./types";

/** Public Word paragraph command methods. */
type WordParagraphCommandMethods<ReturnType> = {
  insertWordBlankPage: () => ReturnType;
  insertWordPageBreak: (options?: { readonly position?: number }) => ReturnType;
  insertWordColumnBreak: (options?: { readonly position?: number }) => ReturnType;
  setWordParagraphProperties: (options: SetWordParagraphPropertiesOptions) => ReturnType;
  setWordParagraphIndentation: (options: SetWordParagraphIndentationOptions) => ReturnType;
  setWordParagraphSpacingSide: (options: SetWordParagraphSpacingSideOptions) => ReturnType;
  setWordParagraphSpacing: (options: SetWordParagraphSpacingOptions) => ReturnType;
  setWordParagraphLineSpacing: (options: SetWordParagraphLineSpacingOptions) => ReturnType;
  increaseWordParagraphIndentation: () => ReturnType;
  decreaseWordParagraphIndentation: () => ReturnType;
  setWordHeading: (attributes: WordHeadingAttributes) => ReturnType;
  toggleWordHeading: (attributes: WordHeadingAttributes) => ReturnType;
  exitWordHeadingAtEnd: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the WordParagraph and WordHeading extensions. */
    readonly wordParagraph: WordParagraphCommandMethods<ReturnType>;
  }
}

/**
 * Creates editor-facing Word paragraph commands.
 *
 * @param paragraphNodeNames - Registered paragraph-like textblock node names.
 * @returns Commands contributed by the Word paragraph extension.
 */
export function createWordParagraphCommands(
  paragraphNodeNames: readonly string[]
): AnyCommands {
  return {
    insertWordBlankPage: defineCommand({
      description: "Inserts an empty page before the paragraph, as Word's Insert > Blank Page does with page breaks around an empty paragraph.",
      target: "block",
      run: createInsertWordBlankPageCommand(paragraphNodeNames)
    }),
    insertWordPageBreak:
      describeWordBreakCommand(createInsertWordPageBreakCommand(paragraphNodeNames), "page"),
    insertWordColumnBreak:
      describeWordBreakCommand(createInsertWordColumnBreakCommand(paragraphNodeNames), "column"),
    setWordParagraphProperties:
      createSetWordParagraphPropertiesCommand(paragraphNodeNames),
    setWordParagraphIndentation:
      createSetWordParagraphIndentationCommand(paragraphNodeNames),
    setWordParagraphSpacingSide: createSetWordParagraphSpacingSideCommand(paragraphNodeNames),
    setWordParagraphSpacing:
      createSetWordParagraphSpacingCommand(paragraphNodeNames),
    setWordParagraphLineSpacing:
      createSetWordParagraphLineSpacingCommand(paragraphNodeNames),
    increaseWordParagraphIndentation:
      createAdjustWordParagraphIndentationCommand(paragraphNodeNames, "increase"),
    decreaseWordParagraphIndentation:
      createAdjustWordParagraphIndentationCommand(paragraphNodeNames, "decrease")
  };
}
