import {
  Extension
} from "@quirekit/core";
import { Plugin, type Transaction } from "@quirekit/pm";
import { createCharacterFormattingProvider } from "./character/provider";
import { createFormattingCommands } from "./commands";
import {
  formattingPluginKey,
  getFormattingPluginState,
  inactiveFormattingState,
  setFormattingPluginState
} from "./plugin-state";
import { collectFormattingProviders } from "./registry";
import type {
  FormattingOptions,
  QuireFormatPainterState,
  QuireFormattingStateSource
} from "./types";

/** Shared format-painter and clear-formatting behavior extension. */
export const Formatting = Extension.create<FormattingOptions>({
  name: "formatting",

  /**
   * Creates the default interaction timing and semantic preservation policy.
   *
   * @returns Formatting behavior defaults.
   */
  addOptions() {
    return {
      doublePressDelay: 500,
      preservedMarks: ["link", "highlight"],
      preservedTextStyleAttributes: [
        "languageLatin",
        "languageEastAsia",
        "languageComplexScript"
      ]
    };
  },

  /**
   * Creates commands around the final resolved provider registry.
   *
   * @returns Format-painter and clear-formatting commands.
   */
  addCommands() {
    const builtin = createCharacterFormattingProvider(this.options);
    return createFormattingCommands(this.options, context => (
      collectFormattingProviders(context.editor.extensions, builtin)
    ));
  },

  /**
   * Cancels the active painter with Escape.
   *
   * @returns Formatting keyboard shortcuts.
   */
  addKeyboardShortcuts() {
    return {
      Escape: ({ commands }) => commands.cancelFormatPainter()
    };
  },

  /**
   * Cancels local painter state when editing is disabled at runtime.
   *
   * @param context - Editor update lifecycle context.
   */
  onUpdate(context) {
    if (
      !context.editor.isEditable
      && readFormatPainterState(context.state).hasSnapshot
    ) {
      context.editor.commands.command(({ tr, dispatch }) => {
        dispatch?.(setFormattingPluginState(tr, inactiveFormattingState, true));
        return true;
      });
    }
  },

  /**
   * Creates local painter state and gesture-completion handlers.
   *
   * @returns ProseMirror plugin list for painter interaction.
   */
  addProseMirrorPlugins() {
    const editor = this.editor!;
    return [new Plugin({
      key: formattingPluginKey,
      state: {
        init: () => inactiveFormattingState,
        apply: (tr, current) => {
          if (tr.getMeta("quireViewUpdateReason") === "document-replace") {
            return inactiveFormattingState;
          }
          return tr.getMeta(formattingPluginKey) ?? current;
        }
      },
      props: {
        handleDOMEvents: {
          pointerup: () => {
            if (getFormattingPluginState(editor.state.pm).mode !== "off") {
              editor.commands.pasteFormatting();
            }
            return false;
          },
          keyup: (_view, event) => {
            if (
              getFormattingPluginState(editor.state.pm).mode !== "off"
              && isKeyboardSelectionCompletion(event as KeyboardEvent)
            ) {
              editor.commands.pasteFormatting();
            }
            return false;
          }
        }
      }
    })];
  }
});

/**
 * Reads public format-painter state without exposing provider snapshot values.
 *
 * @param source - QuireKit or ProseMirror editor state.
 * @returns Public activation state.
 */
export function readFormatPainterState(
  source: QuireFormattingStateSource
): QuireFormatPainterState {
  const state = "pm" in source ? source.pm : source;
  const current = getFormattingPluginState(state);
  return {
    mode: current.mode,
    hasSnapshot: current.snapshot !== null
  };
}

/**
 * Reports whether a transaction explicitly changes local format-painter state.
 *
 * Product shells can use this narrow signal to refresh toggle presentation
 * without subscribing their full action surface to every editor transaction.
 *
 * @param transaction - Applied ProseMirror transaction.
 * @returns Whether the transaction carries a format-painter state transition.
 */
export function transactionChangesFormatPainterState(
  transaction: Transaction
): boolean {
  return transaction.getMeta(formattingPluginKey) !== undefined;
}

/**
 * Reports whether a keyup ends one keyboard selection gesture.
 *
 * @param event - Browser keyboard event routed by the mounted view.
 * @returns Whether format painter should apply after this event.
 */
function isKeyboardSelectionCompletion(event: KeyboardEvent): boolean {
  return event.shiftKey && new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "PageUp",
    "PageDown"
  ]).has(event.key);
}
