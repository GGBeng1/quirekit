import type {} from "@quirekit/accessibility-contract";
import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
  type CommandProps
} from "@quirekit/core";
import { italicDocxCodec } from "./docx";
import type {} from "@quirekit/ai-contract";

/** Options for the italic mark extension. */
export interface ItalicOptions {
  /** HTML attributes added when the italic mark serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Matches italic text wrapped in single asterisks at the input boundary. */
export const starInputRegex = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/;

/** Matches italic text wrapped in single asterisks in pasted text. */
export const starPasteRegex = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))/g;

/** Matches italic text wrapped in single underscores at the input boundary. */
export const underscoreInputRegex = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/;

/** Matches italic text wrapped in single underscores in pasted text. */
export const underscorePasteRegex = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))/g;

/**
 * Parses a semantic italic element.
 *
 * @param node - HTML element matched by the parse rule.
 * @returns Default mark attrs when the element should produce italic, otherwise false.
 */
function parseItalicElement(node: HTMLElement): null | false {
  return node.style.fontStyle.trim().toLowerCase() === "normal" ? false : null;
}

/** Italic mark extension. */
export const Italic = Mark.create<ItalicOptions>({
  name: "italic",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "mark", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "emphasis" }) }];
  },

  addAiCapabilities() {
    return [{
      kind: "format", name: "italic", level: "character", description: "Italic text.", present: { label: "倾斜" },
      read: target => target.level === "character" && target.marks.some(mark => mark.type.name === "italic") ? true : undefined,
      schema: { type: "boolean" },
      apply: ({ commands }, value) => value === true ? commands.setItalic() : commands.unsetItalic()
    }];
  },

  addDocx() {
    return italicDocxCodec;
  },

  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  parseHTML() {
    return [
      { tag: "em" },
      { tag: "i", getAttrs: parseItalicElement },
      {
        style: "font-style=normal",
        clearMark: (mark) => mark.type.name === this.name
      },
      { style: "font-style=italic" }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["em", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  canvasStyle() {
    return { fontStyle: "italic" };
  },

  markdownTokenName: "em",

  parseMarkdown: (token, helpers) =>
    helpers.applyMark("italic", helpers.parseInline(token.tokens || [])),

  renderMarkdown: (node, helpers) => `*${helpers.renderChildren(node)}*`,

  addCommands() {
    return {
      setItalic: () => ({ commands }: CommandProps) =>
        commands.setMark(this.name),
      toggleItalic: () => ({ commands }: CommandProps) =>
        commands.toggleMark(this.name),
      unsetItalic: () => ({ commands }: CommandProps) =>
        commands.unsetMark(this.name)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-i": () => this.editor?.commands.toggleItalic() ?? false,
      "Mod-I": () => this.editor?.commands.toggleItalic() ?? false
    };
  },
  addInputRules() {
    return [
      markInputRule({
        find: starInputRegex,
        type: this.name
      }),
      markInputRule({
        find: underscoreInputRegex,
        type: this.name
      })
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: starPasteRegex,
        type: this.name
      }),
      markPasteRule({
        find: underscorePasteRegex,
        type: this.name
      })
    ];
  }
});

/** Public italic command methods. */
type ItalicCommandMethods<ReturnType> = {
  setItalic: () => ReturnType;
  toggleItalic: () => ReturnType;
  unsetItalic: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the Italic extension. */
    readonly italic: ItalicCommandMethods<ReturnType>;
  }
}

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(Italic.config.canvasStyle!, {
  kind: "document"
});
