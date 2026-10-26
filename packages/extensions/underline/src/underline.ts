import type {} from "@quirekit/accessibility-contract";
import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  Mark,
  mergeAttributes,
  type MarkdownLexerConfiguration,
  type MarkdownToken,
  type CommandProps
} from "@quirekit/core";
import { underlineDocxCodec } from "./docx";
import { isUnderlineActive, isUnderlineStyle, readUnderlineAttributes } from "./validation";
import { underlineStyles } from "./styles";
import type { UnderlineOptions, UnderlineAttributes, UnderlineMarkdownToken, UnderlineStyle } from "./types";
import { parseUnderlineHtml, renderUnderlineHtml } from "./html";
import type {} from "@quirekit/ai-contract";

/**
 * Parses CSS text-decoration values into the underline mark.
 *
 * @param style - CSS text-decoration value.
 * @returns Default mark attrs when the value contains underline, otherwise false.
 */
function parseTextDecoration(style: string): Record<string, never> | false {
  return style.includes("underline") ? {} : false;
}

/** Underline mark extension. */
export const Underline = Mark.create<UnderlineOptions>({
  name: "underline",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "mark", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "underline" }) }];
  },

  addAiCapabilities() {
    // A single underline reads as true; other Word styles read as their name.
    const styles = underlineStyles.filter(style => style !== "none" && style !== "single");
    return [{
      kind: "format", name: "underline", level: "character", present: { label: "下划线" },
      description: `Underline: true for a single line, or a style such as "double", "wave", "dotted" or "thick".`,
      read: target => {
        if (target.level !== "character") return undefined;
        const type = target.marks.find(mark => mark.type.name === "underline")?.attrs.underlineType;
        if (type === undefined || type === "none") return undefined;
        return typeof type === "string" && (styles as readonly string[]).includes(type) ? type : true;
      },
      schema: { anyOf: [{ type: "boolean" }, { enum: styles }] },
      apply: ({ commands }, value) => value === true ? commands.setUnderline()
        : typeof value === "string" ? commands.setUnderline({ underlineType: value as UnderlineStyle }) : commands.unsetUnderline()
    }];
  },

  addDocx() {
    return underlineDocxCodec;
  },

  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },

  addAttributes() {
    return { underlineType: { default: null, rendered: false }, color: { default: undefined, rendered: false } };
  },

  parseHTML() {
    return [
      { tag: "u", getAttrs: node => parseUnderlineHtml(node as HTMLElement) },
      { tag: "span[data-qk-underline]", getAttrs: node => parseUnderlineHtml(node as HTMLElement) },
      {
        style: "text-decoration",
        consuming: false,
        getAttrs: (style) => parseTextDecoration(style as string)
      }
    ];
  },

  renderHTML({ mark, HTMLAttributes }) {
    return [readUnderlineAttributes(mark.attrs).underlineType === "none" ? "span" : "u", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, renderUnderlineHtml(readUnderlineAttributes(mark.attrs))), 0];
  },

  canvasStyle(mark) {
    const { underlineType: style, color } = readUnderlineAttributes(mark.attrs);
    if (style === "none") return {};
    return { textDecoration: ["underline"], underline: { style,
      ...(color === null ? {} : { color }) } };
  },

  parseMarkdown(token, helpers) {
    const underlineToken = token as UnderlineMarkdownToken;

    return helpers.applyMark(
      this.name || "underline",
      helpers.parseInline(underlineToken.tokens || [])
    );
  },

  renderMarkdown(node, helpers) {
    const content = helpers.renderChildren(node);
    return readUnderlineAttributes(node.attrs ?? {}).underlineType === "none" ? content : `++${content}++`;
  },

  markdownTokenizer: {
    name: "underline",
    level: "inline",
    start(source) {
      return source.indexOf("++");
    },
    tokenize(
      source,
      _tokens,
      lexer: MarkdownLexerConfiguration
    ): MarkdownToken | undefined {
      const match = /^(\+\+)([\s\S]+?)(\+\+)/.exec(source);

      if (!match) {
        return undefined;
      }

      const innerContent = match[2]?.trim() ?? "";

      return {
        type: "underline",
        raw: match[0],
        text: innerContent,
        tokens: lexer.inlineTokens(innerContent)
      };
    }
  },

  addCommands() {
    return {
      setUnderline: (attributes: UnderlineAttributes = { underlineType: "single" }) => ({ commands }: CommandProps) =>
        (attributes.underlineType === undefined || isUnderlineStyle(attributes.underlineType))
        && (attributes.color == null || /^#[0-9a-f]{6}$/iu.test(attributes.color))
        && commands.setMark(this.name, attributes),
      toggleUnderline: () => ({ state, commands }: CommandProps) =>
        isUnderlineActive(state)
          ? commands.unsetMark(this.name)
          : commands.setMark(this.name, { underlineType: "single" }),
      unsetUnderline: () => ({ commands }: CommandProps) =>
        commands.unsetMark(this.name)
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-u": ({ commands }) => commands.toggleUnderline(),
      "Mod-U": ({ commands }) => commands.toggleUnderline()
    };
  }
});

/** Public underline command methods. */
type UnderlineCommandMethods<ReturnType> = {
  setUnderline: (attributes?: UnderlineAttributes) => ReturnType;
  toggleUnderline: () => ReturnType;
  unsetUnderline: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the Underline extension. */
    readonly underline: UnderlineCommandMethods<ReturnType>;
  }
}

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(Underline.config.canvasStyle!, {
  kind: "document"
});
