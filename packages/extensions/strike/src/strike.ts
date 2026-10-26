import type {} from "@quirekit/accessibility-contract";
import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
  type CommandProps
} from "@quirekit/core";
import { strikeDocxCodec } from "./docx";
import type {} from "@quirekit/ai-contract";

/** Options for the strike mark extension. */
export interface StrikeOptions {
  /** HTML attributes added when the strike mark serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Matches strike text wrapped in double tildes at the input boundary. */
export const inputRegex = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/;

/** Matches strike text wrapped in double tildes in pasted text. */
export const pasteRegex = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))/g;

/**
 * Parses CSS text-decoration values into the strike mark.
 *
 * @param style - CSS text-decoration value.
 * @returns Default mark attrs when the value contains line-through, otherwise false.
 */
function parseTextDecoration(style: string): Record<string, never> | false {
  return style.includes("line-through") ? {} : false;
}

/** Strike mark extension. */
export const Strike = Mark.create<StrikeOptions>({
  name: "strike",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "mark", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "strike" }) }];
  },

  addAiCapabilities() {
    return [{
      kind: "format", name: "strike", level: "character", description: "Struck-through text.", present: { label: "删除线" },
      read: target => target.level === "character" && target.marks.some(mark => mark.type.name === "strike") ? true : undefined,
      schema: { type: "boolean" },
      apply: ({ commands }, value) => value === true ? commands.setStrike() : commands.unsetStrike()
    }];
  },

  addDocx() {
    return strikeDocxCodec;
  },

  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },

  parseHTML() {
    return [
      { tag: "s" },
      { tag: "del" },
      { tag: "strike" },
      {
        style: "text-decoration",
        consuming: false,
        getAttrs: (style) => parseTextDecoration(style as string)
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["s", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  canvasStyle() {
    return { textDecoration: ["line-through"] };
  },

  markdownTokenName: "del",

  parseMarkdown: (token, helpers) =>
    helpers.applyMark("strike", helpers.parseInline(token.tokens || [])),

  renderMarkdown: (node, helpers) => `~~${helpers.renderChildren(node)}~~`,

  addCommands() {
    return {
      setStrike: () => ({ commands }: CommandProps) =>
        commands.setMark(this.name),
      toggleStrike: () => ({ commands }: CommandProps) =>
        commands.toggleMark(this.name),
      unsetStrike: () => ({ commands }: CommandProps) =>
        commands.unsetMark(this.name)
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-s": () => this.editor?.commands.toggleStrike() ?? false
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: inputRegex,
        type: this.name
      })
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: pasteRegex,
        type: this.name
      })
    ];
  }
});

/** Public strike command methods. */
type StrikeCommandMethods<ReturnType> = {
  setStrike: () => ReturnType;
  toggleStrike: () => ReturnType;
  unsetStrike: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the Strike extension. */
    readonly strike: StrikeCommandMethods<ReturnType>;
  }
}

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(Strike.config.canvasStyle!, {
  kind: "document"
});
