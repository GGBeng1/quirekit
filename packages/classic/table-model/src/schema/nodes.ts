import { mergeAttributes, Node } from "@quirekit/core";
import type { NodeSpec } from "@quirekit/pm";
import {
  wordTableAttributes,
  wordTableCellAttributes,
  wordTableRowAttributes
} from "./attrs";
import { createWordTableEditorCommands } from "../commands/editor";
import { wordTableSelectionContribution } from "../selection/adapter";
import { createWordTableTripleClickPlugin } from "../interaction";
import { createWordTableClipboardPlugin } from "../clipboard/plugin";
import { createWordTableStyleHtmlPlugin } from "../style/dom";
import type {
  WordTableNodeSpecMap,
  WordTableRole,
  WordTableRoleNodeSpec
} from "../types";
import { wordTableAiCapabilities } from "../ai/facts/capabilities";

/**
 * Creates a ProseMirror schema field object carrying a table role.
 *
 * @param tableRole - Table role to attach to the node spec.
 * @returns Extra node schema fields for a Word table node.
 */
function createTableRoleFields(tableRole: WordTableRole): Partial<NodeSpec> {
  return { tableRole } as Partial<NodeSpec>;
}

/** Raw ProseMirror spec for Word-compatible table nodes. */
export const wordTableNodeSpec = {
  group: "block",
  content: "wordTableRow+",
  isolating: true,
  tableRole: "table",
  attrs: wordTableAttributes,
  parseDOM: [{ tag: "table" }]
} satisfies WordTableRoleNodeSpec;

/** Raw ProseMirror spec for Word-compatible table row nodes. */
export const wordTableRowNodeSpec = {
  content: "wordTableCell+",
  tableRole: "row",
  attrs: wordTableRowAttributes,
  parseDOM: [{ tag: "tr" }]
} satisfies WordTableRoleNodeSpec;

/** Raw ProseMirror spec for Word-compatible table cell nodes. */
export const wordTableCellNodeSpec = {
  content: "block+",
  isolating: true,
  tableRole: "cell",
  attrs: wordTableCellAttributes,
  parseDOM: [{ tag: "td" }, { tag: "th" }]
} satisfies WordTableRoleNodeSpec;

/** Raw ProseMirror node specs keyed by Word table node name. */
export const wordTableNodeSpecs = {
  wordTable: wordTableNodeSpec,
  wordTableRow: wordTableRowNodeSpec,
  wordTableCell: wordTableCellNodeSpec
} satisfies WordTableNodeSpecMap;

/** Tiptap-compatible extension for a Word-compatible table node. */
export const WordTable = Node.create({
  name: "wordTable",
  addAiCapabilities() {
    return wordTableAiCapabilities;
  },
  group: "block",
  content: "wordTableRow+",
  isolating: true,
  addAttributes() {
    return wordTableAttributes;
  },
  /** @returns Document-level table style registry declaration. */
  addGlobalAttributes() {
    return [{
      types: ["doc"],
      attributes: {
        wordTableStyleRegistry: { default: null, rendered: false }
      }
    }];
  },
  extendNodeSchema(extension) {
    return extension.name === "wordTable" ? createTableRoleFields("table") : null;
  },
  parseHTML() {
    return [{ tag: "table" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "table",
      mergeAttributes(
        { style: "border-collapse: collapse; width: 100%" },
        HTMLAttributes
      ),
      ["tbody", 0]
    ];
  },
  addCommands() {
    return createWordTableEditorCommands();
  },
  /** Cell traversal outranks list levels and follows form-field traversal. */
  keyboardShortcutPriority: 920,
  /** @returns Word cell traversal for Tab and Shift+Tab inside table cells. */
  addKeyboardShortcuts() {
    return {
      Tab: ({ commands }) => commands.moveToWordTableCell("forward"),
      "Shift-Tab": ({ commands }) => commands.moveToWordTableCell("backward")
    };
  },
  addSelection() {
    return [wordTableSelectionContribution];
  },
  /**
   * Adds table-owned structural selection and clipboard parsing plugins.
   *
   * @returns ProseMirror interaction plugins owned by Word Table.
   */
  addProseMirrorPlugins() {
    return [
      createWordTableTripleClickPlugin(this.editor!),
      createWordTableClipboardPlugin(this.editor!),
      createWordTableStyleHtmlPlugin()
    ];
  }
});

/** Tiptap-compatible extension for a Word-compatible table row node. */
export const WordTableRow = Node.create({
  name: "wordTableRow",
  content: "wordTableCell+",
  addAttributes() {
    return wordTableRowAttributes;
  },
  extendNodeSchema(extension) {
    return extension.name === "wordTableRow" ? createTableRoleFields("row") : null;
  },
  parseHTML() {
    return [{ tag: "tr" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["tr", HTMLAttributes, 0];
  }
});

/** Tiptap-compatible extension for a Word-compatible table cell node. */
export const WordTableCell = Node.create({
  name: "wordTableCell",
  content: "block+",
  isolating: true,
  addAttributes() {
    return wordTableCellAttributes;
  },
  extendNodeSchema(extension) {
    return extension.name === "wordTableCell" ? createTableRoleFields("cell") : null;
  },
  parseHTML() {
    return [{ tag: "td" }, { tag: "th" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "td",
      mergeAttributes(
        { style: "border: 1px solid #000000; padding: 4px 6px" },
        HTMLAttributes
      ),
      0
    ];
  }
});

/** Extension set that installs all Word table schema nodes. */
export const WordTableExtensions = [
  WordTable,
  WordTableRow,
  WordTableCell
] as const;
