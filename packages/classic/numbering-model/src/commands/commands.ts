import { createUpdateWordNumberingDefinitionCommand } from "./preset/edit";
import type { UpdateWordNumberingDefinitionOptions } from "../templates/types";
import type { AnyCommands } from "@quirekit/core";
import { createAdjustWordListLevelCommand } from "./level";
import {
  createApplyWordNumberingPresetCommand,
  createApplyWordNumberingTemplateCommand
} from "./preset";
import {
  createWordNumberingSequenceAtPositionCommand,
  createWordNumberingSequenceCommand
} from "./restart";
import {
  createSetWordTaskCheckedCommand,
  createToggleWordTaskAtPositionCommand
} from "./task";
import {
  createClearWordListAtPositionCommand,
  createClearWordListCommand,
  createToggleWordListCommand
} from "./toggle";
import { createMergeWordNumberingRegistryCommand } from "./registry";
import type { ApplyWordNumberingPresetOptions } from "../presets/types";
import type { ApplyWordNumberingTemplateOptions } from "../templates/types";
import type {
  MergeWordNumberingRegistryOptions,
  RestartWordNumberingAtPositionOptions,
  RestartWordNumberingOptions,
  SetWordTaskCheckedOptions,
  ToggleWordOrderedListOptions,
  ToggleWordTaskAtPositionOptions,
  ToggleWordTaskListOptions,
  WordNumberingAtPositionOptions
} from "../types";

/** Public Word numbering command methods. */
type WordNumberingCommandMethods<ReturnType> = {
  updateWordNumberingDefinition: (options: UpdateWordNumberingDefinitionOptions) => ReturnType;
  mergeWordNumberingRegistry: (options: MergeWordNumberingRegistryOptions) => ReturnType;
  applyWordNumberingPreset: (options: ApplyWordNumberingPresetOptions) => ReturnType;
  applyWordNumberingTemplate: (options: ApplyWordNumberingTemplateOptions) => ReturnType;
  toggleWordOrderedList: (options?: ToggleWordOrderedListOptions) => ReturnType;
  toggleWordBulletList: () => ReturnType;
  toggleWordTaskList: (options?: ToggleWordTaskListOptions) => ReturnType;
  clearWordList: () => ReturnType;
  clearWordListAtPosition: (options: WordNumberingAtPositionOptions) => ReturnType;
  increaseWordListLevel: () => ReturnType;
  decreaseWordListLevel: () => ReturnType;
  toggleWordTaskChecked: () => ReturnType;
  setWordTaskChecked: (options: SetWordTaskCheckedOptions) => ReturnType;
  toggleWordTaskAtPosition: (options: ToggleWordTaskAtPositionOptions) => ReturnType;
  restartWordNumbering: (options: RestartWordNumberingOptions) => ReturnType;
  continueWordNumbering: () => ReturnType;
  restartWordNumberingAtPosition: (
    options: RestartWordNumberingAtPositionOptions
  ) => ReturnType;
  continueWordNumberingAtPosition: (
    options: WordNumberingAtPositionOptions
  ) => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the WordNumbering extension. */
    readonly wordNumbering: WordNumberingCommandMethods<ReturnType>;
  }
}

/**
 * Creates the editor-facing Word numbering command family.
 *
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Commands contributed by the Word numbering extension.
 */
export function createWordNumberingCommands(
  paragraphTypes: readonly string[]
): AnyCommands {
  return {
    updateWordNumberingDefinition: createUpdateWordNumberingDefinitionCommand(),
    mergeWordNumberingRegistry: createMergeWordNumberingRegistryCommand(),
    applyWordNumberingPreset: createApplyWordNumberingPresetCommand(paragraphTypes),
    applyWordNumberingTemplate:
      createApplyWordNumberingTemplateCommand(paragraphTypes),
    toggleWordOrderedList: createToggleWordListCommand("ordered", paragraphTypes),
    toggleWordBulletList: createToggleWordListCommand("bullet", paragraphTypes),
    toggleWordTaskList: createToggleWordListCommand("task", paragraphTypes),
    clearWordList: createClearWordListCommand(paragraphTypes),
    clearWordListAtPosition: createClearWordListAtPositionCommand(paragraphTypes),
    increaseWordListLevel: createAdjustWordListLevelCommand(1, paragraphTypes),
    decreaseWordListLevel: createAdjustWordListLevelCommand(-1, paragraphTypes),
    toggleWordTaskChecked: createSetWordTaskCheckedCommand("toggle", paragraphTypes),
    setWordTaskChecked: createSetWordTaskCheckedCommand("set", paragraphTypes),
    toggleWordTaskAtPosition: createToggleWordTaskAtPositionCommand(paragraphTypes),
    restartWordNumbering: createWordNumberingSequenceCommand("restart", paragraphTypes),
    continueWordNumbering: createWordNumberingSequenceCommand("continue", paragraphTypes),
    restartWordNumberingAtPosition: createWordNumberingSequenceAtPositionCommand(
      "restart",
      paragraphTypes
    ),
    continueWordNumberingAtPosition: createWordNumberingSequenceAtPositionCommand(
      "continue",
      paragraphTypes
    )
  };
}
