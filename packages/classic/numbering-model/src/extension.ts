import {
  Extension,
  type CommandProps
} from "@quirekit/core";
import { createWordNumberingCommands } from "./commands";
import { createWordNumberingInputRules } from "./input";
import { createWordNumberingFormattingProvider } from "./formatting-provider";
import { wordNumberingViewEventHandlers } from "./interaction";
import { resolveWordParagraphNumbering } from "./model";
import { defaultWordNumberingParagraphTypes } from "./selection";
import { createBuiltinWordNumberingPresets } from "./presets";
import { splitWordParagraphNumbering } from "./model/split";
import { wordNumberingAiCapabilities } from "./ai/facts";

/** Options for Word numbering schema, commands, and input behavior. */
export interface WordNumberingOptions {
  /** Paragraph-like node names that receive flat numbering references. */
  readonly types: readonly string[];
}

/** Flat Word-compatible paragraph numbering extension. */
export const WordNumbering = Extension.create<WordNumberingOptions>({
  name: "wordNumbering",
  keyboardShortcutPriority: 900,

  addOptions() {
    return { types: defaultWordNumberingParagraphTypes };
  },

  addGlobalAttributes() {
    return [
      {
        types: ["doc"],
        attributes: {
          wordNumberingRegistry: { default: null, rendered: false }
        }
      },
      {
        types: [...this.options.types],
        attributes: {
          wordNumbering: {
            default: null,
            rendered: false,
            keepOnSplit: true,
            splitValue: splitWordParagraphNumbering
          }
        }
      }
    ];
  },

  addCommands() {
    return {
      ...createWordNumberingCommands(this.options.types)
    };
  },

  addFormattingProviders() {
    return [createWordNumberingFormattingProvider(this.options.types)];
  },

  addAiCapabilities() {
    return wordNumberingAiCapabilities;
  },

  addWordNumberingPresets() {
    return createBuiltinWordNumberingPresets();
  },

  addInputRules() {
    return createWordNumberingInputRules();
  },

  addKeyboardShortcuts() {
    return {
      Tab: (context: CommandProps) =>
        isWordListLevelTabPosition(context) && context.commands.increaseWordListLevel(),
      "Shift-Tab": (context: CommandProps) =>
        isWordListLevelTabPosition(context) && context.commands.decreaseWordListLevel(),
      "Mod-Shift-7": ({ commands }: CommandProps) => commands.toggleWordOrderedList(),
      "Mod-Shift-8": ({ commands }: CommandProps) => commands.toggleWordBulletList(),
      Enter: (context: CommandProps) => handleEmptyWordListEnter(context)
    };
  },

  viewEventHandlers: wordNumberingViewEventHandlers
});

/**
 * Applies the Word-compatible empty-item Enter state transition.
 *
 * Empty nested items return one level at a time. An empty root item exits the
 * list. Non-empty items fall through to the ordinary paragraph split command.
 *
 * @param context - Keymap-owned command context and shared transaction.
 * @returns Whether the empty-list transition consumed Enter.
 */
function handleEmptyWordListEnter(
  context: CommandProps
): boolean {
  const parent = context.tr.selection.$from.parent;
  const numbering = resolveWordParagraphNumbering(parent.attrs.wordNumbering);
  if (
    !parent.isTextblock
    || parent.content.size !== 0
    || numbering === null
  ) {
    return false;
  }
  return numbering.level > 0
    ? context.commands.decreaseWordListLevel()
    : context.commands.clearWordList();
}

/**
 * Reports whether Tab changes list levels rather than inserting a tab character.
 *
 * Word changes the level only at the start of a paragraph or across paragraphs.
 *
 * @param context - Keyboard command context.
 * @returns Whether the selection starts a paragraph or spans several.
 */
function isWordListLevelTabPosition(context: CommandProps): boolean {
  const { $from, $to } = context.state.selection;
  return $from.parentOffset === 0 || !$from.sameParent($to);
}
