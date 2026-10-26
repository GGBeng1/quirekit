import { Extension, Node } from "@quirekit/core";
import { definitionCommands } from "./commands";
/** Canonical editable term/description structure, without generated placeholder text. */
export const BlockDefinitions = Extension.create({
  name: "blockDefinitions", keyboardShortcutPriority: 150,
  /** @returns Portable definition list elements. */
  addExtensions() { return [
    Node.create({ name: "definitionList", group: "block", content: "definitionItem+", defining: true,
      /** @returns Semantic list import rule. */
      parseHTML: () => [{ tag: "dl" }],
      /** @param context - Canonical attributes. @returns Portable list markup. */
      renderHTML: ({ HTMLAttributes }) => ["dl", { ...HTMLAttributes, class: "qk-block-definitions" }, 0] }),
    Node.create({ name: "definitionItem", content: "definitionTerm definitionDescription", defining: true,
      /** @returns Semantic paired fields import rule. */
      parseHTML: () => [{ tag: "div[data-definition-item]" }],
      /** @returns Editable paired fields content container. */
      renderHTML: () => ["div", { "data-definition-item": "true" }, 0] }),
    Node.create({ name: "definitionTerm", content: "inline*", defining: true,
      /** @returns Semantic term import rule. */
      parseHTML: () => [{ tag: "dt" }],
      /** @returns Editable term content container. */
      renderHTML: () => ["dt", { "data-placeholder": "输入术语" }, 0] }),
    Node.create({ name: "definitionDescription", content: "paragraph+", defining: true,
      /** @returns Semantic explanation import rule. */
      parseHTML: () => [{ tag: "dd" }],
      /** @returns Editable explanation content container. */
      renderHTML: () => ["dd", {}, 0] })
  ]; },
  /** @returns Source-owned list mutations. */
  addCommands: definitionCommands,
  /** @returns Enter in a term moves into its explanation; Tab moves between paired fields. */
  addKeyboardShortcuts() { return {
    Enter: () => this.editor?.state.pm.selection.$from.parent.type.name === "definitionTerm" && this.editor.commands.navigateBlockDefinition("description") || false,
    Tab: () => this.editor?.commands.navigateBlockDefinition("description") ?? false,
    "Shift-Tab": () => this.editor?.commands.navigateBlockDefinition("term") ?? false
  }; },
  /** @returns Operations scoped to the clicked definition list. */
  addBlockMenuProviders: () => [{ id: "definitions", getItems: ({ editor, block }) => block.node.type.name === "definitionList" ? [
    { value: "add", label: "添加术语", icon: "plus", run: () => editor.commands.addBlockDefinition(block.from) },
    { value: "unwrap", label: "转换为普通段落", icon: "paragraph", run: () => editor.commands.unwrapBlockDefinitions(block.from) }
  ] : [] }]
});
