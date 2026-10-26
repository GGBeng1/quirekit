import type {} from "@quirekit/accessibility-contract";
import {
  mergeAttributes,
  Node,
  type CommandProps
} from "@quirekit/core";
import {
  parseOrderedListMarkdown,
  renderOrderedListMarkdown,
  orderedListMarkdownTokenizer
} from "./markdown";
import { createOrderedListInputRules } from "./input-rules";
import type { OrderedListOptions } from "../types";

const ListItemName = "listItem";
const TextStyleName = "textStyle";

/** Ordered list node extension. */
export const OrderedList = Node.create<OrderedListOptions>({
  name: "orderedList",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "node", name: this.name,
      /** @param node - Canonical source. @returns Owned native semantics. */
      describe: (node) => ({ kind: "list", ordered: true, start: Number.isSafeInteger(node.attrs.start) ? node.attrs.start : 1, textNavigation: true }) }];
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

  addAttributes() {
    return {
      start: {
        default: 1,
        parseHTML: (element) =>
          element.hasAttribute("start")
            ? Number.parseInt(element.getAttribute("start") || "", 10)
            : 1
      },
      type: {
        default: null,
        parseHTML: (element) => element.getAttribute("type")
      }
    };
  },

  parseHTML() {
    return [{ tag: "ol" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { start, ...attributesWithoutStart } = HTMLAttributes;

    return start === 1
      ? ["ol", mergeAttributes(this.options.HTMLAttributes, attributesWithoutStart), 0]
      : ["ol", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  markdownTokenName: "list",

  parseMarkdown: (token, helpers) => parseOrderedListMarkdown(token, helpers),

  renderMarkdown: (node, helpers) => renderOrderedListMarkdown(node, helpers),

  markdownTokenizer: orderedListMarkdownTokenizer,

  markdownOptions: {
    indentsContent: true
  },

  addCommands() {
    return {
      toggleOrderedList: () => ({ commands, chain }: CommandProps) => {
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
      "Mod-Shift-7": () => this.editor?.commands.toggleOrderedList() ?? false
    };
  },

  addInputRules() {
    return createOrderedListInputRules({
      nodeName: this.name,
      keepMarks: this.options.keepMarks,
      keepAttributes: this.options.keepAttributes,
      getTextStyleAttributes: () => this.editor?.getAttributes(TextStyleName) ?? {},
      editor: this.editor
    });
  }
});

/** Public ordered-list command methods. */
type OrderedListCommandMethods<ReturnType> = {
  toggleOrderedList: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the OrderedList extension. */
    readonly orderedList: OrderedListCommandMethods<ReturnType>;
  }
}
