import type {} from "@quirekit/accessibility-contract";
import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  mergeAttributes,
  Node,
  textblockTypeInputRule,
  type CommandProps
} from "@quirekit/core";
import { headingDocxCodec } from "./docx";
import type { HeadingOptions, HeadingAttributes, HeadingMarkdownToken, Level } from "./types";
export type { HeadingOptions, HeadingAttributes, Level } from "./types";

/** Canvas font scale applied to each heading level over the base body size. */
const headingCanvasFontScales: Readonly<Record<Level, number>> = {
  1: 2,
  2: 1.5,
  3: 1.25,
  4: 1.1,
  5: 1,
  6: 0.85
};

/**
 * Resolves the canvas font scale for a heading level.
 *
 * @param level - Heading level, defaulting to level one when out of range.
 * @returns Multiplier applied to the inherited base font size.
 */
function headingCanvasFontScale(level: Level): number {
  return headingCanvasFontScales[level] ?? headingCanvasFontScales[1];
}

/** Heading block node extension. */
export const Heading = Node.create<HeadingOptions>({
  name: "heading",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "node", name: this.name,
      /** @param node - Canonical source. @returns Owned native semantics. */
      describe: (node) => ({ kind: "heading", level: this.options.levels.includes(node.attrs.level) ? node.attrs.level : this.options.levels[0], editable: true }) }];
  },

  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {}
    };
  },

  content: "inline*",

  group: "block",

  defining: true,

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false
      }
    };
  },

  parseHTML() {
    return this.options.levels.map((level) => ({
      tag: `h${level}`,
      attrs: { level }
    }));
  },

  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level as Level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];

    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0
    ];
  },

  canvasTextStyle(node) {
    return {
      documentFontRole: "heading",
      documentOutlineLevel: node.attrs.level as Level,
      fontScale: headingCanvasFontScale(node.attrs.level as Level),
      fontWeight: "bold"
    } as const;
  },

  parseMarkdown: (token, helpers) => {
    const headingToken = token as HeadingMarkdownToken;
    const level = normalizeHeadingLevel(headingToken.depth);

    return helpers.createNode(
      "heading",
      { level },
      helpers.parseInline([...(headingToken.tokens ?? [])])
    );
  },

  renderMarkdown: (node, helpers) => {
    const level = normalizeHeadingLevel(node.attrs?.level);
    const headingChars = "#".repeat(level);

    if (!node.content) {
      return "";
    }

    return `${headingChars} ${helpers.renderChildren(node.content)}`;
  },

  addDocx() {
    return headingDocxCodec;
  },

  addCommands() {
    return {
      setHeading: (attributes: HeadingAttributes) => (
        { commands }: CommandProps
      ) => {
        if (!this.options.levels.includes(attributes.level)) {
          return false;
        }

        return commands.setNode(this.name, attributes);
      },

      toggleHeading: (attributes: HeadingAttributes) => (
        { commands }: CommandProps
      ) => {
        if (!this.options.levels.includes(attributes.level)) {
          return false;
        }

        return commands.toggleNode(this.name, "paragraph", attributes);
      }
    };
  },

  addKeyboardShortcuts() {
    return this.options.levels.reduce<Record<string, () => boolean>>(
      (items, level) => ({
        ...items,
        [`Mod-Alt-${level}`]: () =>
          this.editor?.commands.toggleHeading({ level }) ?? false
      }),
      {}
    );
  },

  addInputRules() {
    return this.options.levels.map((level) =>
      textblockTypeInputRule({
        find: new RegExp(`^(#{${Math.min(...this.options.levels)},${level}})\\s$`),
        type: this.name,
        getAttributes: { level }
      })
    );
  }
});

/**
 * Normalizes arbitrary heading level input to a supported Markdown level.
 *
 * @param value - Raw heading level from attrs or Markdown tokens.
 * @returns Heading level clamped to the one-to-six Markdown range.
 */
function normalizeHeadingLevel(value: unknown): Level {
  const parsed = typeof value === "string"
    ? Number.parseInt(value, 10)
    : value;

  if (
    parsed === 1 ||
    parsed === 2 ||
    parsed === 3 ||
    parsed === 4 ||
    parsed === 5 ||
    parsed === 6
  ) {
    return parsed;
  }

  return 1;
}

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(Heading.config.canvasTextStyle!, {
  kind: "document"
});
