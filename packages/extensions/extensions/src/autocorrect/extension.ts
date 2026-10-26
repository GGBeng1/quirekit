import { Extension, InputRule } from "@quirekit/core";
import { defaultAutoCorrectEntries, defaultFirstLetterExceptions } from "./defaults";
import { findAutoCorrectReplacement, findSentenceCapitalization } from "./match";
import type { AutoCorrectMatch, AutoCorrectOptions, AutoCorrectSettings, AutoCorrectStorage } from "./types";

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the AutoCorrect extension. */
    readonly autoCorrect: {
      /** Replaces the AutoCorrect settings and saves them to the host store. */
      setAutoCorrectSettings: (settings: AutoCorrectSettings) => ReturnType;
    };
  }
}

/**
 * Word-style AutoCorrect: replaces table entries and capitalizes sentence starts as you type.
 *
 * Corrections run as undoable input rules, so Backspace right after one restores
 * the typed text, IME text is checked once composition commits, and code is skipped.
 */
export const AutoCorrect = Extension.create<AutoCorrectOptions, AutoCorrectStorage>({
  name: "autoCorrect",

  /** @returns Word's symbol table, sentence capitalization on, no persistence. */
  addOptions() {
    return {
      defaults: { replaceText: true, capitalizeSentences: true, entries: defaultAutoCorrectEntries },
      firstLetterExceptions: defaultFirstLetterExceptions,
      store: null
    };
  },

  /** @returns Saved settings, or the defaults. */
  addStorage() {
    let saved: AutoCorrectSettings | null = null;
    try {
      saved = this.options.store?.load() ?? null;
    } catch {
      saved = null;
    }
    return { settings: saved ?? this.options.defaults };
  },

  /** @returns The settings command. */
  addCommands() {
    return {
      setAutoCorrectSettings: (settings: AutoCorrectSettings) => () => {
        this.storage.settings = settings;
        try {
          this.options.store?.save(settings);
        } catch {
          // Settings still apply to this editor when the host cannot keep them.
        }
        return true;
      }
    };
  },

  /** @returns Replacement and sentence-capitalization rules reading the current settings. */
  addInputRules() {
    const storage = this.storage;
    const exceptions = new Set(this.options.firstLetterExceptions.map(item => item.toLowerCase()));
    /**
     * @param text - Text before the caret including the typed text.
     * @param found - Correction, or null.
     * @returns Input rule match replacing the corrected characters.
     */
    const toRuleMatch = (text: string, found: AutoCorrectMatch | null) => found === null ? null : {
      index: text.length - found.length,
      text: text.slice(text.length - found.length),
      data: { replacement: found.replacement }
    };
    /** @returns Handler inserting the correction over the matched range. */
    const handler = () => ({ state, range, match }: Parameters<ConstructorParameters<typeof InputRule>[0]["handler"]>[0]) => {
      state.tr.insertText(String(match.data?.replacement ?? ""), range.from, range.to);
    };
    return [
      new InputRule({
        find: text => storage.settings.replaceText ? toRuleMatch(text, findAutoCorrectReplacement(text, storage.settings.entries)) : null,
        handler: handler()
      }),
      new InputRule({
        find: text => storage.settings.capitalizeSentences ? toRuleMatch(text, findSentenceCapitalization(text, exceptions)) : null,
        handler: handler()
      })
    ];
  }
});
