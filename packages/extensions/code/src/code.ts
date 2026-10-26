import type {} from "@quirekit/ai-contract";
import type {} from "@quirekit/accessibility-contract";
import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
  type MarkdownToken,
  type CommandProps
} from "@quirekit/core";
import { codeDocxCodec } from "./docx";
import { createCodeAiCapabilities } from "./ai/facts";

/** Options for the inline code mark extension. */
export interface CodeOptions {
  /** HTML attributes added when the code mark serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Matches inline code wrapped in backticks at the input boundary. */
export const inputRegex = /(^|[^`])`([^`]+)`(?!`)$/;

/** Matches inline code wrapped in backticks in pasted text. */
export const pasteRegex = /(^|[^`])`([^`]+)`(?!`)/g;

/** Markdown code span token shape produced by marked. */
interface CodeMarkdownToken extends MarkdownToken {
  /** Raw code span text. */
  readonly text?: string | undefined;
}

/** Inline code mark extension. */
export const Code = Mark.create<CodeOptions>({
  name: "code",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "mark", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "code" }) }];
  },

  addDocx() {
    return codeDocxCodec;
  },

  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },

  excludes: "_",

  code: true,

  exitable: true,

  parseHTML() {
    return [{ tag: "code" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["code", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  canvasStyle() {
    return { fontFamily: "monospace" };
  },

  markdownTokenName: "codespan",

  parseMarkdown: (token, helpers) => {
    const codeToken = token as CodeMarkdownToken;

    return helpers.applyMark("code", [
      { type: "text", text: codeToken.text ?? "" }
    ]);
  },

  renderMarkdown: (node, helpers) => {
    if (!node.content) {
      return "";
    }

    return `\`${helpers.renderChildren(node.content)}\``;
  },

  /** @returns The AI facts of this node or mark. */
  addAiCapabilities() {
    return createCodeAiCapabilities(this.name);
  },

  addCommands() {
    return {
      setCode: () => ({ commands }: CommandProps) =>
        commands.setMark(this.name),
      toggleCode: () => ({ commands }: CommandProps) =>
        commands.toggleMark(this.name),
      unsetCode: () => ({ commands }: CommandProps) =>
        commands.unsetMark(this.name)
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-e": () => this.editor?.commands.toggleCode() ?? false
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

/** Public inline-code command methods. */
type CodeCommandMethods<ReturnType> = {
  setCode: () => ReturnType;
  toggleCode: () => ReturnType;
  unsetCode: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the Code extension. */
    readonly code: CodeCommandMethods<ReturnType>;
  }
}

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(Code.config.canvasStyle!, {
  kind: "document"
});
