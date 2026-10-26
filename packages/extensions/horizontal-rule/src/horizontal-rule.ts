import type {} from "@quirekit/ai-contract";
import type {} from "@quirekit/accessibility-contract";
import {
  canInsertNode,
  getAttributes,
  isNodeSelection,
  mergeAttributes,
  Node,
  nodeInputRule,
  type CommandProps
} from "@quirekit/core";
import { NodeSelection, TextSelection } from "@quirekit/pm";
import { wordRevisionNodeAttributes } from "@quirekit/classic-revision-contract";
import { horizontalRuleDocxCodec } from "./docx";
import {
  defaultHorizontalRuleStyle,
  normalizeHorizontalRuleStyle,
  parseHorizontalRuleHtml,
  serializeHorizontalRuleHtml
} from "./style";
import type {
  HorizontalRuleOptions,
  HorizontalRuleStyleInput
} from "./types";
import { createHorizontalRuleAiCapabilities } from "./ai/facts";

export type { HorizontalRuleOptions } from "./types";

/** Matches Markdown-style horizontal rule input at the start of a textblock. */
export const inputRegex = /^(?:---|—-|___\s|\*\*\*\s)$/;

/** Horizontal rule block node extension. */
export const HorizontalRule = Node.create<HorizontalRuleOptions>({
  name: "horizontalRule",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "node", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "separator" }) }];
  },

  addOptions() {
    return {
      HTMLAttributes: {},
      nextNodeType: "paragraph",
      defaultStyle: defaultHorizontalRuleStyle
    };
  },

  group: "block",

  addAttributes() {
    return {
      ...wordRevisionNodeAttributes,
      variant: {
        default: this.options.defaultStyle.variant,
        rendered: false
      },
      color: {
        default: this.options.defaultStyle.color,
        rendered: false
      },
      thicknessPt: {
        default: this.options.defaultStyle.thicknessPt,
        rendered: false
      },
      widthPercent: {
        default: this.options.defaultStyle.widthPercent,
        rendered: false
      },
      alignment: {
        default: this.options.defaultStyle.alignment,
        rendered: false
      }
    };
  },

  /** @returns Shared insertion policy and fail-closed style revision lane. */
  addWordRevisions() {
    return [{
      id: "extension.horizontal-rule.revision",
      nodePolicies: [{
        nodeType: this.name,
        insertion: "node" as const,
        docx: "unsupported" as const
      }],
      nodeCapabilities: [{
        nodeType: this.name,
        lane: "property" as const,
        classification: "explicit-reject" as const,
        evidenceId: "extension.horizontal-rule.revision.style-rejected",
        docx: "unsupported" as const
      }]
    }];
  },

  parseHTML() {
    return [{
      tag: "hr",
      getAttrs: (element) => parseHorizontalRuleHtml(
        element as HTMLElement,
        this.options.defaultStyle
      )
    }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = normalizeHorizontalRuleStyle(
      node.attrs,
      this.options.defaultStyle
    );
    return [
      "hr",
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        serializeHorizontalRuleHtml(style)
      )
    ];
  },

  markdownTokenName: "hr",

  parseMarkdown: (_token, helpers) => helpers.createNode(
    "horizontalRule",
    { ...defaultHorizontalRuleStyle }
  ),

  renderMarkdown: () => "---",

  addDocx() {
    return horizontalRuleDocxCodec;
  },

  /** @returns The AI facts of this node or mark. */
  addAiCapabilities() {
    return createHorizontalRuleAiCapabilities(this.name);
  },

  addCommands() {
    const setHorizontalRule = (style?: HorizontalRuleStyleInput) => (
      { dispatch, state, tr }: CommandProps
    ) => {
      const nodeType = state.schema.nodes[this.name];

      if (!nodeType || !canInsertNode(state, nodeType)) {
        return false;
      }

      const { selection } = state;
      const { $to: $originTo } = selection;
      const insertPosition = isNodeSelection(selection) || $originTo.depth === 0
        ? $originTo.pos
        : $originTo.after();

      if (dispatch) {
        const horizontalRule = nodeType.create(normalizeHorizontalRuleStyle(
          style,
          this.options.defaultStyle
        ));

        tr.insert(insertPosition, horizontalRule);

        const posAfter = insertPosition + horizontalRule.nodeSize;
        const $after = tr.doc.resolve(posAfter);

        if ($after.nodeAfter) {
          if ($after.nodeAfter.isTextblock) {
            tr.setSelection(TextSelection.create(tr.doc, posAfter + 1));
          } else if ($after.nodeAfter.isBlock) {
            tr.setSelection(NodeSelection.create(tr.doc, posAfter));
          } else {
            tr.setSelection(TextSelection.create(tr.doc, posAfter));
          }
        } else {
          const defaultType = $after.parent.type.contentMatch.defaultType;
          const nextNodeType =
            state.schema.nodes[this.options.nextNodeType] ?? defaultType;
          const nextNode = nextNodeType?.create();

          if (nextNode) {
            tr.insert(posAfter, nextNode);
            tr.setSelection(TextSelection.create(tr.doc, posAfter + 1));
          }
        }

        tr.scrollIntoView();
      }

      return true;
    };

    const updateHorizontalRule = (style: HorizontalRuleStyleInput) => (
      { commands, state }: CommandProps
    ) => commands.updateAttributes(
      this.name,
      { ...normalizeHorizontalRuleStyle(
        {
          ...getAttributes(state, this.name),
          ...style
        },
        this.options.defaultStyle
      ) }
    );

    return {
      setHorizontalRule,
      updateHorizontalRule
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.name
      })
    ];
  }
});

/** Public horizontal-rule command methods. */
type HorizontalRuleCommandMethods<ReturnType> = {
  setHorizontalRule: (style?: HorizontalRuleStyleInput) => ReturnType;
  updateHorizontalRule: (style: HorizontalRuleStyleInput) => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the HorizontalRule extension. */
    readonly horizontalRule: HorizontalRuleCommandMethods<ReturnType>;
  }
}
