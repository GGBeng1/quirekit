import { createWordNamedStyleCommand } from "./named/create";
import { createApplyWordCharacterStyleCommand, createUpdateWordCharacterStyleCommand, createApplyWordLinkedStyleCommand } from "./named/character";
import type {} from "./named/types";
import type { AnyCommands } from "@quirekit/core";
import { createSetWordParagraphDecorationCommand, createFinishWordParagraphDecorationEditCommand } from "../decoration";
import { createApplyWordParagraphStyleCommand } from "./apply";
import {
  createResetWordParagraphStyleRegistryCommand,
  createSetWordParagraphStyleRegistryCommand,
  createUpdateWordParagraphStyleCommand
} from "./registry";
import type {
  ApplyWordParagraphStyleOptions,
  SetWordParagraphStyleRegistryOptions,
  UpdateWordParagraphStyleOptions
} from "./types";
import { describeWordParagraphStyleUpdateCommand } from "./agent";

/** Public Word paragraph-style command methods. */
type WordParagraphStyleCommandMethods<ReturnType> = {
  applyWordParagraphStyle: (options: ApplyWordParagraphStyleOptions) => ReturnType;
  setWordParagraphStyleRegistry: (
    options: SetWordParagraphStyleRegistryOptions
  ) => ReturnType;
  updateWordParagraphStyle: (options: UpdateWordParagraphStyleOptions) => ReturnType;
  resetWordParagraphStyleRegistry: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the WordStyles extension. */
    readonly wordStyles: WordParagraphStyleCommandMethods<ReturnType>;
  }
}

/**
 * Creates the complete Word paragraph style command family.
 *
 * @param paragraphNodeNames - Textblock node names that own Word formatting.
 * @returns Named style application and registry commands.
 */
export function createWordParagraphStyleCommands(
  paragraphNodeNames: readonly string[]
): AnyCommands {
  return {
    createWordNamedStyle: createWordNamedStyleCommand(),
    applyWordCharacterStyle: createApplyWordCharacterStyleCommand(),
    updateWordCharacterStyle: createUpdateWordCharacterStyleCommand(),
    applyWordLinkedStyle: createApplyWordLinkedStyleCommand(paragraphNodeNames),
    setWordParagraphDecoration: createSetWordParagraphDecorationCommand(paragraphNodeNames),
    finishWordParagraphDecorationEdit: createFinishWordParagraphDecorationEditCommand(),
    applyWordParagraphStyle:
      createApplyWordParagraphStyleCommand(paragraphNodeNames),
    setWordParagraphStyleRegistry:
      createSetWordParagraphStyleRegistryCommand(),
    updateWordParagraphStyle:
      describeWordParagraphStyleUpdateCommand(createUpdateWordParagraphStyleCommand()),
    resetWordParagraphStyleRegistry:
      createResetWordParagraphStyleRegistryCommand()
  };
}
