import type {} from "@quirekit/accessibility-contract";
import {
  mergeAttributes,
  Node,
  wrappingInputRule,
  type InputRule,
  type MarkdownParseResult,
  type CommandProps,
  type QuireJSONContent,
  type MarkdownToken
} from "@quirekit/core";
import type { BulletListOptions } from "../types";

const ListItemName = "listItem";
const TextStyleName = "textStyle";

/** Matches a bullet list marker typed at the start of a textblock. */
export const bulletListInputRegex = /^\s*([-+*])\s$/;

/** Markdown token shape used by list parsers. */
interface BulletListMarkdownToken extends MarkdownToken {
  /** Whether the list token is ordered. */
  readonly ordered?: boolean | undefined;
  /** List item child tokens. */
  readonly items?: readonly MarkdownToken[] | undefined;
}

/** Bullet list node extension. */
export const BulletList = Node.create<BulletListOptions>({
  name: "bulletList",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "node", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "list", textNavigation: true }) }];
  },

  addOptions() {
    return {
      itemTypeName: "listItem",
      HTMLAttributes: {},
      keepMarks: false,
      keepAttributes: false
    };
  },

  group: "block list",

  content() {
    return `${this.options.itemTypeName}+`;
  },

  parseHTML() {
    return [{ tag: "ul" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["ul", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  markdownTokenName: "list",

  parseMarkdown: (token, helpers): MarkdownParseResult => {
    const listToken = token as BulletListMarkdownToken;

    if (listToken.type !== "list" || listToken.ordered) {
      return [];
    }

    return helpers.createNode(
      "bulletList",
      undefined,
      listToken.items ? helpers.parseChildren([...listToken.items]) : []
    );
  },

  renderMarkdown: (node: QuireJSONContent, helpers) => {
    if (!node.content) {
      return "";
    }

    return helpers.renderChildren(node.content, "\n");
  },

  markdownOptions: {
    indentsContent: true
  },

  addCommands() {
    return {
      toggleBulletList: () => ({ commands, chain }: CommandProps) => {
        if (this.options.keepAttributes) {
          return chain()
            .toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
            .updateAttributes(
              ListItemName,
              this.editor?.getAttributes(TextStyleName) ?? {}
            )
            .run();
        }

        return commands.toggleList(
          this.name,
          this.options.itemTypeName,
          this.options.keepMarks
        );
      }
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-8": () => this.editor?.commands.toggleBulletList() ?? false
    };
  },

  addInputRules() {
    return createBulletListInputRules({
      nodeName: this.name,
      keepMarks: this.options.keepMarks,
      keepAttributes: this.options.keepAttributes,
      getTextStyleAttributes: () => this.editor?.getAttributes(TextStyleName) ?? {},
      editor: this.editor
    });
  }
});

/** Public bullet-list command methods. */
type BulletListCommandMethods<ReturnType> = {
  toggleBulletList: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the BulletList extension. */
    readonly bulletList: BulletListCommandMethods<ReturnType>;
  }
}

/** Options used to build bullet list input rules. */
interface BulletListInputRuleOptions {
  /** Node type name used for bullet list wrappers. */
  readonly nodeName: string;
  /** Whether active marks should be preserved. */
  readonly keepMarks: boolean;
  /** Whether active text-style attributes should be preserved. */
  readonly keepAttributes: boolean;
  /** Attribute reader used when keepAttributes is enabled. */
  readonly getTextStyleAttributes: () => Record<string, unknown>;
  /** Editor instance forwarded to the input rule when available. */
  readonly editor: Parameters<typeof wrappingInputRule>[0]["editor"];
}

/**
 * Creates Tiptap-compatible bullet list input rules.
 *
 * @param options - Input rule options resolved from the extension.
 * @returns Bullet list input rules.
 */
function createBulletListInputRules(
  options: BulletListInputRuleOptions
): readonly InputRule[] {
  if (!options.keepMarks && !options.keepAttributes) {
    return [
      wrappingInputRule({
        find: bulletListInputRegex,
        type: options.nodeName
      })
    ];
  }

  return [
    wrappingInputRule({
      find: bulletListInputRegex,
      type: options.nodeName,
      keepMarks: options.keepMarks,
      keepAttributes: options.keepAttributes,
      getAttributes: () => options.getTextStyleAttributes(),
      editor: options.editor
    })
  ];
}
