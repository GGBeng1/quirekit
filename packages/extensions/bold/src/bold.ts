import type {} from "@quirekit/accessibility-contract";
import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
  type CommandProps
} from "@quirekit/core";
import { boldDocxCodec } from "./docx";
import type {} from "@quirekit/ai-contract";

/** Options for the bold mark extension. */
export interface BoldOptions {
  /** HTML attributes added when the bold mark serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Matches bold text wrapped in double asterisks at the input boundary. */
export const starInputRegex = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/;

/** Matches bold text wrapped in double asterisks in pasted text. */
export const starPasteRegex = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))/g;

/** Matches bold text wrapped in double underscores at the input boundary. */
export const underscoreInputRegex = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;

/** Matches bold text wrapped in double underscores in pasted text. */
export const underscorePasteRegex = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g;

/**
 * Parses a semantic bold element.
 *
 * @param node - HTML element matched by the parse rule.
 * @returns Default mark attrs when the element should produce bold, otherwise false.
 */
function parseBoldElement(node: HTMLElement): null | false {
  const fontWeight = node.style.fontWeight.trim().toLowerCase();

  return fontWeight === "normal" || fontWeight === "400" ? false : null;
}

/**
 * Parses CSS font-weight values into the bold mark.
 *
 * @param value - CSS font-weight value.
 * @returns Default mark attrs when the value is bold enough, otherwise false.
 */
function parseBoldFontWeight(value: string): null | false {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "bold" || normalizedValue === "bolder") {
    return null;
  }

  const numericWeight = Number.parseInt(normalizedValue, 10);

  return Number.isFinite(numericWeight) && numericWeight >= 500 ? null : false;
}

/** Bold mark extension. */
export const Bold = Mark.create<BoldOptions>({
  name: "bold",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "mark", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "strong" }) }];
  },

  addAiCapabilities() {
    return [{
      kind: "format", name: "bold", level: "character", description: "Bold text.", present: { label: "加粗" },
      read: target => target.level === "character" && target.marks.some(mark => mark.type.name === "bold") ? true : undefined,
      schema: { type: "boolean" },
      apply: ({ commands }, value) => value === true ? commands.setBold() : commands.unsetBold()
    }];
  },

  addDocx() {
    return boldDocxCodec;
  },

  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  parseHTML() {
    return [
      { tag: "strong" },
      { tag: "b", getAttrs: parseBoldElement },
      {
        style: "font-weight=400",
        clearMark: (mark) => mark.type.name === this.name
      },
      { style: "font-weight", getAttrs: parseBoldFontWeight }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["strong", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  canvasStyle() {
    return { fontWeight: "bold" };
  },

  markdownTokenName: "strong",

  parseMarkdown: (token, helpers) =>
    helpers.applyMark("bold", helpers.parseInline(token.tokens || [])),

  renderMarkdown: (node, helpers) => `**${helpers.renderChildren(node)}**`,

  addCommands() {
    return {
      setBold: () => ({ commands }: CommandProps) =>
        commands.setMark(this.name),
      toggleBold: () => ({ commands }: CommandProps) =>
        commands.toggleMark(this.name),
      unsetBold: () => ({ commands }: CommandProps) =>
        commands.unsetMark(this.name)
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-b": () => this.editor?.commands.toggleBold() ?? false,
      "Mod-B": () => this.editor?.commands.toggleBold() ?? false
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

/** Public bold command methods. */
type BoldCommandMethods<ReturnType> = {
  setBold: () => ReturnType;
  toggleBold: () => ReturnType;
  unsetBold: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the Bold extension. */
    readonly bold: BoldCommandMethods<ReturnType>;
  }
}

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(Bold.config.canvasStyle!, {
  kind: "document"
});
