import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  Mark,
  mergeAttributes,
  type CommandProps
} from "@quirekit/core";
import { highlightDocxCodec } from "./docx";
import { normalizeHighlightToken, resolveHighlightTokenFromCss } from "./normalize";
import { ooxmlHighlightCssColors, resolveHighlightCssColor } from "./palette";
import {
  applyHighlighterPen,
  createHighlighterPenPlugin,
  readHighlighterPenState,
  startHighlighterPen,
  stopHighlighterPen
} from "./pen";

/** Options for the semantic highlight mark extension. */
export interface HighlightOptions {
  /** HTML attributes added when the highlight mark serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
  /** Highlight token applied when a new mark does not specify one. */
  readonly defaultColor: string;
}

/** Canonical attributes stored on one semantic highlight mark. */
export interface HighlightAttributes {
  /** OOXML highlight token or a CSS-compatible color. */
  readonly color?: string | null | undefined;
}

/** Semantic text highlight mark, distinct from arbitrary character shading. */
export const Highlight = Mark.create<HighlightOptions>({
  name: "highlight",

  // Word does not extend a highlight to text typed at its end; text typed inside it stays highlighted.
  inclusive: false,

  /** @returns The highlighter colour as an AI character format, in Word's palette. */
  addAiCapabilities() {
    const colors = Object.keys(ooxmlHighlightCssColors).filter(color => color !== "none");
    return [{
      kind: "format", name: "highlight", level: "character", present: { label: "荧光笔" },
      description: `Highlighter colour: ${colors.map(color => JSON.stringify(color)).join(", ")}.`,
      read: target => {
        if (target.level !== "character") return undefined;
        const color = target.marks.find(mark => mark.type.name === this.name)?.attrs.color;
        return typeof color === "string" && colors.includes(color) ? color : undefined;
      },
      schema: { enum: colors },
      apply: ({ commands }, value) => typeof value === "string" ? commands.setHighlight({ color: value }) : commands.unsetHighlight()
    }];
  },

  addDocx() {
    return highlightDocxCodec;
  },

  addOptions() {
    return {
      HTMLAttributes: {},
      defaultColor: "yellow"
    };
  },

  addAttributes() {
    return {
      color: {
        default: this.options.defaultColor,
        parseHTML: (element) => readHtmlHighlightToken(element) ?? this.options.defaultColor,
        renderHTML: (attrs) => {
          const color = readHighlightColor(attrs.color, this.options.defaultColor);
          return {
            "data-qk-highlight-color": color,
            style: `background-color: ${resolveHighlightCssColor(color)}`
          };
        }
      }
    };
  },

  parseHTML() {
    // Transparent paint carries no highlight; other colors become a palette token.
    return [{ tag: "mark", getAttrs: (element) => readHtmlHighlightToken(element as HTMLElement) === null ? false : null }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  canvasStyle(mark) {
    const color = readHighlightColor(mark.attrs.color, "yellow");
    return { highlightColor: color === "none" ? null : resolveHighlightCssColor(color) };
  },

  addCommands() {
    return {
      setHighlight: (attributes?: HighlightAttributes) => (
        { commands }: CommandProps
      ) => commands.setMark(this.name, attributes),
      toggleHighlight: (attributes?: HighlightAttributes) => (
        { commands }: CommandProps
      ) => commands.toggleMark(this.name, attributes),
      unsetHighlight: () => (
        { commands }: CommandProps
      ) => commands.unsetMark(this.name),
      startHighlighterPen: (color: string | null) => startHighlighterPen(color),
      stopHighlighterPen: () => stopHighlighterPen,
      applyHighlighterPen: () => applyHighlighterPen(this.name)
    };
  },

  /** @returns Escape leaves highlighter-pen mode. */
  addKeyboardShortcuts() {
    return { Escape: ({ commands }) => commands.stopHighlighterPen() };
  },

  /**
   * Leaves pen mode when editing is disabled at runtime.
   *
   * @param context - Editor update lifecycle context.
   */
  onUpdate(context) {
    if (!context.editor.isEditable && readHighlighterPenState(context.state).active) {
      context.editor.commands.stopHighlighterPen();
    }
  },

  /** @returns Highlighter-pen state and gesture-completion handling. */
  addProseMirrorPlugins() {
    return [createHighlighterPenPlugin(this.editor!)];
  }
});

/**
 * Reads the highlight token carried by pasted or QuireKit-rendered HTML.
 *
 * @param element - `<mark>` element being parsed.
 * @returns Palette token, null for transparent paint, or undefined when the element names no color.
 */
function readHtmlHighlightToken(element: HTMLElement): string | null | undefined {
  const token = normalizeHighlightToken(element.getAttribute("data-qk-highlight-color"));
  if (token !== null) return token;
  const css = element.style.backgroundColor;
  return css ? resolveHighlightTokenFromCss(css) : undefined;
}

/**
 * Reads a non-empty highlight token with a stable default.
 *
 * @param value - Candidate schema attribute.
 * @param fallback - Default token configured by the extension.
 * @returns Canonical highlight token.
 */
function readHighlightColor(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(Highlight.config.canvasStyle!, {
  kind: "document"
});
