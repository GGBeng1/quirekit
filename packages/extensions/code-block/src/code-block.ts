import type {} from "@quirekit/ai-contract";
import type {} from "@quirekit/accessibility-contract";
import {
  mergeAttributes,
  Node,
  type CommandProps
} from "@quirekit/core";
import { wordRevisionNodeAttributes } from "@quirekit/classic-revision-contract";
import { codeBlockDocxCodec } from "./docx";
import { createCodeBlockInputRules } from "./input-rules";
import { parseLanguageFromCodeElement } from "./language";
import {
  parseCodeBlockMarkdown,
  renderCodeBlockMarkdown
} from "./markdown";
import {
  createCodeBlockPastePlugin,
  createInsertCodeBlockFromClipboardCommand,
  type InsertCodeBlockFromClipboardOptions
} from "./paste";
import { createCodeBlockKeyboardShortcuts } from "./shortcuts";
import {
  DEFAULT_TAB_SIZE,
  type CodeBlockAttributes,
  type CodeBlockMarkdownToken,
  type CodeBlockOptions
} from "./types";
import { createCodeBlockAiCapabilities } from "./ai/facts";

/** Public code-block command methods contributed through module augmentation. */
type CodeBlockCommandMethods<ReturnType> = {
  setCodeBlock: (attributes?: CodeBlockAttributes) => ReturnType;
  toggleCodeBlock: (attributes?: CodeBlockAttributes) => ReturnType;
  insertCodeBlockFromClipboard: (
    options: InsertCodeBlockFromClipboardOptions
  ) => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Code-block commands installed by the CodeBlock extension. */
    readonly codeBlock: CodeBlockCommandMethods<ReturnType>;
  }
}

/** Code block node extension. */
export const CodeBlock = Node.create<CodeBlockOptions>({
  name: "codeBlock",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "node", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "code-block", editable: true }) }];
  },

  addOptions() {
    return {
      languageClassPrefix: "language-",
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      defaultLanguage: null,
      enableTabIndentation: false,
      tabSize: DEFAULT_TAB_SIZE,
      HTMLAttributes: {}
    };
  },

  content: "text*",

  marks: "",

  group: "block",

  code: true,

  whitespace: "pre",

  defining: true,

  addAttributes() {
    return {
      ...wordRevisionNodeAttributes,
      language: {
        default: this.options.defaultLanguage,
        parseHTML: (element) =>
          parseLanguageFromCodeElement(element, this.options.languageClassPrefix),
        rendered: false
      }
    };
  },

  /** @returns Shared insertion policy and fail-closed property/topology lanes. */
  addWordRevisions() {
    return [{
      id: "extension.code-block.revision",
      nodePolicies: [{
        nodeType: this.name,
        insertion: "node" as const,
        docx: "unsupported" as const
      }],
      nodeCapabilities: [
        {
          nodeType: this.name,
          lane: "property" as const,
          classification: "explicit-reject" as const,
          evidenceId: "extension.code-block.revision.language-rejected",
          docx: "unsupported" as const
        },
        {
          nodeType: this.name,
          lane: "topology" as const,
          classification: "explicit-reject" as const,
          evidenceId: "extension.code-block.revision.transform-rejected",
          docx: "unsupported" as const
        }
      ]
    }];
  },

  parseHTML() {
    return [
      {
        tag: "pre",
        preserveWhitespace: "full"
      }
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      [
        "code",
        {
          class: node.attrs.language
            ? `${this.options.languageClassPrefix ?? ""}${node.attrs.language}`
            : null
        },
        0
      ]
    ];
  },

  markdownTokenName: "code",

  parseMarkdown: (token, helpers) =>
    parseCodeBlockMarkdown(token as CodeBlockMarkdownToken, helpers),

  renderMarkdown: (node, helpers) => renderCodeBlockMarkdown(node, helpers),

  addDocx() {
    return codeBlockDocxCodec;
  },

  /** @returns The AI facts of this node or mark. */
  addAiCapabilities() {
    return createCodeBlockAiCapabilities(this.name);
  },

  addCommands() {
    return {
      setCodeBlock: (attributes?: CodeBlockAttributes) => (
        { commands }: CommandProps
      ) => commands.setNode(this.name, attributes),
      toggleCodeBlock: (attributes?: CodeBlockAttributes) => (
        { commands }: CommandProps
      ) => commands.toggleNode(this.name, "paragraph", attributes),
      insertCodeBlockFromClipboard:
        createInsertCodeBlockFromClipboardCommand(this.name)
    };
  },

  addKeyboardShortcuts() {
    return createCodeBlockKeyboardShortcuts({
      editor: this.editor,
      nodeName: this.name,
      extensionOptions: this.options
    });
  },

  addInputRules() {
    return createCodeBlockInputRules(this.name);
  },

  addProseMirrorPlugins() {
    return [
      createCodeBlockPastePlugin({
        nodeName: this.name,
        editor: this.editor!
      })
    ];
  }
});

export type { CodeBlockAttributes, CodeBlockOptions } from "./types";
