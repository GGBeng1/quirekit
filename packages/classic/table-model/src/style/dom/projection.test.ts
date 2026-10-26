import { createEditor, isQuireDomOnlyDecorations } from "@quirekit/core";
import { DecorationSet } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { createWordTableMap } from "../../map";
import { WordTableExtensions } from "../../schema";
import {
  createWordTableLookAttrs,
  installWordTableStyleDefinition,
  resolveWordTableCellHtmlStyles,
  resolveWordTableStyleRegistry,
  wordTableBuiltinStyles,
  wordThreeLineTableLook,
  wordThreeLineTableStyleId
} from "..";

const registry = wordTableBuiltinStyles.reduce(
  installWordTableStyleDefinition,
  resolveWordTableStyleRegistry(null)
);

/**
 * Creates an editor with one 3×2 table.
 *
 * @param tableAttrs - Table attributes.
 * @param docRegistry - Document registry attribute.
 * @returns Editor.
 */
function createTableEditor(tableAttrs: Record<string, unknown>, docRegistry: unknown = registry) {
  const row = {
    type: "wordTableRow",
    content: [0, 1].map(() => ({ type: "wordTableCell", content: [{ type: "paragraph" }] }))
  };
  return createEditor({
    extensions: [...WordTableExtensions],
    content: {
      type: "doc",
      attrs: { wordTableStyleRegistry: docRegistry },
      content: [{ type: "wordTable", attrs: tableAttrs, content: [row, row, row] }]
    }
  });
}

describe("table style HTML projection", () => {
  it("emits three-line rules as inline cell borders", () => {
    const editor = createTableEditor({
      tableStyle: wordThreeLineTableStyleId,
      tableLook: createWordTableLookAttrs(wordThreeLineTableLook)
    });
    const table = editor.state.doc.child(0);
    const styles = resolveWordTableCellHtmlStyles(table, createWordTableMap(table), registry)!;
    const at = (row: number, cell: number) => styles.find(style => style.rowIndex === row && style.cellIndex === cell)!.style;
    expect(at(0, 0)).toContain("border-top: 1.5pt solid #000000");
    expect(at(0, 0)).toContain("border-bottom: 0.75pt solid #000000");
    expect(at(0, 0)).toContain("border-left: none");
    expect(at(0, 0)).toContain("border-right: none");
    expect(at(1, 1)).toContain("border-top: none");
    expect(at(2, 1)).toContain("border-bottom: 1.5pt solid #000000");
    expect(at(1, 0)).toContain("padding: 0pt 5.4pt 0pt 5.4pt");
  });

  it("decorates cells only for styled tables", () => {
    const styled = createTableEditor({ tableStyle: "TableGrid" });
    const plain = createTableEditor({});
    const decorations = (editor: ReturnType<typeof createTableEditor>) => {
      let found = 0;
      editor.state.pm.plugins.forEach(plugin => {
        const decorate = plugin.props.decorations as ((state: unknown) => unknown) | undefined;
        const set = decorate?.call(plugin, editor.state.pm);
        if (set instanceof DecorationSet) found += set.find().length;
      });
      return found;
    };
    // Six cells plus their six paragraphs, which receive Table Grid's compact spacing.
    expect(decorations(styled)).toBe(12);
    expect(decorations(plain)).toBe(0);
  });

  it("builds cell decorations only when a DOM view reads them, once per document", () => {
    const editor = createTableEditor({ tableStyle: "TableGrid" });
    const plugin = editor.state.pm.plugins.find(candidate => isQuireDomOnlyDecorations(candidate.props.decorations))!;
    const decorate = plugin.props.decorations as (state: unknown) => unknown;
    const first = decorate.call(plugin, editor.state.pm);
    expect(decorate.call(plugin, editor.state.pm)).toBe(first);
    editor.commands.insertContentAt(4, "x");
    expect(decorate.call(plugin, editor.state.pm)).not.toBe(first);
  });
});
