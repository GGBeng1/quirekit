import { Extension } from "@quirekit/core";
import { Plugin, PluginKey, type Node as ProseMirrorNode } from "@quirekit/pm";

/** Options accepted by the character-count extension. */
export interface CharacterCountOptions {
  /** Maximum allowed character count. `null`, `undefined`, and `0` disable the limit. */
  readonly limit: number | null | undefined;
  /** Counting mode used by the `characters()` storage helper. */
  readonly mode: "textSize" | "nodeSize";
  /**
   * Counts text characters.
   *
   * @param text - Plain text extracted from the inspected node.
   * @returns Character count.
   */
  readonly textCounter: (text: string) => number;
  /**
   * Counts words.
   *
   * @param text - Plain text extracted from the inspected node.
   * @returns Word count.
   */
  readonly wordCounter: (text: string) => number;
}

/** Storage API exposed by `editor.storage.characterCount`. */
export interface CharacterCountStorage {
  /**
   * Counts characters for a node, or the current document by default.
   *
   * @param options - Optional target node and mode override.
   * @returns Character count for the target node.
   */
  characters: (
    options?: {
      /** Node whose content should be counted. */
      readonly node?: ProseMirrorNode | undefined;
      /** Counting mode override. */
      readonly mode?: CharacterCountOptions["mode"] | undefined;
    }
  ) => number;
  /**
   * Counts words for a node, or the current document by default.
   *
   * @param options - Optional target node.
   * @returns Word count for the target node.
   */
  words: (
    options?: {
      /** Node whose text should be counted. */
      readonly node?: ProseMirrorNode | undefined;
    }
  ) => number;
}

/** Extension that counts document characters and words, with an optional limit. */
export const CharacterCount = Extension.create<
  CharacterCountOptions,
  CharacterCountStorage
>({
  name: "characterCount",

  /**
   * Creates default character-count options.
   *
   * @returns Default character-count configuration.
   */
  addOptions() {
    return {
      limit: null,
      mode: "textSize",
      textCounter: (text: string) => text.length,
      wordCounter: (text: string) => text.split(" ").filter((word) => word !== "").length
    };
  },

  /**
   * Creates the storage shape before editor-bound helpers are installed.
   *
   * @returns Character-count storage placeholders.
   */
  addStorage() {
    return {
      characters: () => 0,
      words: () => 0
    };
  },

  /** Installs editor-bound storage helpers before create hooks run. */
  onBeforeCreate() {
    const editor = this.editor;

    if (!editor) {
      return;
    }

    this.storage.characters = (options) => {
      const node = options?.node ?? editor.state.doc;
      const mode = options?.mode ?? this.options.mode;

      if (mode === "textSize") {
        const text = node.textBetween(0, node.content.size, undefined, " ");

        return this.options.textCounter(text);
      }

      return node.nodeSize;
    };

    this.storage.words = (options) => {
      const node = options?.node ?? editor.state.doc;
      const text = node.textBetween(0, node.content.size, " ", " ");

      return this.options.wordCounter(text);
    };
  },

  /**
   * Creates the limit enforcement plugin.
   *
   * @returns ProseMirror plugin list containing character-count enforcement.
   */
  addProseMirrorPlugins() {
    let initialEvaluationDone = false;

    return [
      new Plugin({
        key: new PluginKey("characterCount"),
        appendTransaction: (_transactions, _oldState, newState) => {
          if (initialEvaluationDone) {
            return;
          }

          const limit = this.options.limit;

          if (limit === null || limit === undefined || limit === 0) {
            initialEvaluationDone = true;
            return;
          }

          const initialContentSize = this.storage.characters({ node: newState.doc });

          if (initialContentSize > limit) {
            const over = initialContentSize - limit;
            const from = 0;
            const to = over;

            console.warn(
              `[CharacterCount] Initial content exceeded limit of ${limit} characters. Content was automatically trimmed.`
            );
            const tr = newState.tr.deleteRange(from, to);

            initialEvaluationDone = true;
            return tr;
          }

          initialEvaluationDone = true;
        },
        filterTransaction: (transaction, state) => {
          const limit = this.options.limit;

          if (
            !transaction.docChanged ||
            limit === 0 ||
            limit === null ||
            limit === undefined
          ) {
            return true;
          }

          const oldSize = this.storage.characters({ node: state.doc });
          const newSize = this.storage.characters({ node: transaction.doc });

          if (newSize <= limit) {
            return true;
          }

          if (oldSize > limit && newSize > limit && newSize <= oldSize) {
            return true;
          }

          if (oldSize > limit && newSize > limit && newSize > oldSize) {
            return false;
          }

          const isPaste = transaction.getMeta("paste");

          if (!isPaste) {
            return false;
          }

          const pos = transaction.selection.$head.pos;
          const over = newSize - limit;
          const from = pos - over;
          const to = pos;

          transaction.deleteRange(from, to);

          const updatedSize = this.storage.characters({ node: transaction.doc });

          if (updatedSize > limit) {
            return false;
          }

          return true;
        }
      })
    ];
  }
});
