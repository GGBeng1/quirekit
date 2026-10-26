import type {} from "@quirekit/ai-contract";
import type {} from "@quirekit/accessibility-contract";
import {
  mergeAttributes,
  Node,
  wrappingInputRule,
  type CommandProps,
  type QuireJSONContent
} from "@quirekit/core";
import { wordRevisionNodeAttributes } from "@quirekit/classic-revision-contract";
import { blockquoteDocxCodec } from "./docx";
import { createBlockquoteAiCapabilities } from "./ai/facts";

/** Options for the blockquote node extension. */
export interface BlockquoteOptions {
  /** HTML attributes added when the blockquote serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Matches `>` at the start of a textblock. */
export const inputRegex = /^\s*>\s$/;

/** Blockquote node extension. */
export const Blockquote = Node.create<BlockquoteOptions>({
  name: "blockquote",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "node", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "blockquote", textNavigation: true }) }];
  },

  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },

  content: "block+",

  group: "block",

  defining: true,

  /** @returns Shared whole-node revision carrier. */
  addAttributes() {
    return wordRevisionNodeAttributes;
  },

  /** @returns Shared insertion policy and honest unsupported topology lane. */
  addWordRevisions() {
    return [{
      id: "extension.blockquote.revision",
      nodePolicies: [{
        nodeType: this.name,
        insertion: "node" as const,
        docx: "unsupported" as const
      }],
      nodeCapabilities: [{
        nodeType: this.name,
        lane: "topology" as const,
        classification: "explicit-reject" as const,
        evidenceId: "extension.blockquote.revision.topology-rejected",
        docx: "unsupported" as const
      }]
    }];
  },

  parseHTML() {
    return [{ tag: "blockquote" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["blockquote", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  parseMarkdown: (token, helpers) =>
    helpers.createNode(
      "blockquote",
      undefined,
      helpers.parseChildren(token.tokens || [])
    ),

  renderMarkdown: (node, helpers) => {
    if (!node.content) {
      return "";
    }

    const result: string[] = [];

    node.content.forEach((child: QuireJSONContent) => {
      const childContent = helpers.renderChildren([child]);
      const lines = childContent.split("\n");
      const prefixedLines = lines.map((line) =>
        line.trim() === "" ? ">" : `> ${line}`
      );

      result.push(prefixedLines.join("\n"));
    });

    return result.join("\n>\n");
  },

  addDocx() {
    return blockquoteDocxCodec;
  },

  /** @returns The AI facts of this node or mark. */
  addAiCapabilities() {
    return createBlockquoteAiCapabilities(this.name);
  },

  addCommands() {
    return {
      setBlockquote: () => ({ commands }: CommandProps) =>
        commands.wrapIn(this.name),
      toggleBlockquote: () => ({ commands }: CommandProps) =>
        commands.toggleWrap(this.name),
      unsetBlockquote: () => ({ commands }: CommandProps) =>
        commands.lift(this.name)
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-b": () => this.editor?.commands.toggleBlockquote() ?? false
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: inputRegex,
        type: this.name
      })
    ];
  }
});

/** Public blockquote command methods. */
type BlockquoteCommandMethods<ReturnType> = {
  setBlockquote: () => ReturnType;
  toggleBlockquote: () => ReturnType;
  unsetBlockquote: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the Blockquote extension. */
    readonly blockquote: BlockquoteCommandMethods<ReturnType>;
  }
}
