import { createEditor } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { TextSelection } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { WordTableExtensions } from "../../schema";
import {
  resolveWordTableStyleLook,
  resolveWordTableStyleRegistry,
  wordThreeLineTableStyleId
} from "../../style";

const border = { style: "single", size: 8, color: "FF0000", space: 0 };

/**
 * Creates an editor holding one 2×2 table with direct formatting.
 *
 * @returns Editor with undo history.
 */
function createStyledEditor() {
  const cell = {
    type: "wordTableCell",
    attrs: { borders: { top: border }, shading: { fill: "FFFF00", color: null, pattern: "clear" } },
    content: [{ type: "paragraph" }]
  };
  return createEditor({
    extensions: [...WordTableExtensions, UndoRedo],
    content: {
      type: "doc",
      content: [{
        type: "wordTable",
        attrs: { alignment: "center", borders: { top: border } },
        content: [
          { type: "wordTableRow", content: [cell, cell] },
          { type: "wordTableRow", content: [cell, cell] }
        ]
      }]
    }
  });
}

describe("table style commands", () => {
  it("applies a built-in style, installs its chain, and clears direct formatting", () => {
    const editor = createStyledEditor();
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 4)));

    expect(editor.commands.applyWordTableStyle({
      styleId: wordThreeLineTableStyleId,
      look: { firstColumn: false, bandedRows: false }
    })).toBe(true);

    const table = editor.state.doc.child(0);
    const registry = resolveWordTableStyleRegistry(editor.state.doc.attrs.wordTableStyleRegistry);
    expect(Object.keys(registry.styles).sort()).toEqual(["QuireThreeLineTable", "TableNormal"]);
    expect(table.attrs).toMatchObject({ tableStyle: wordThreeLineTableStyleId, alignment: "center", borders: null });
    expect(resolveWordTableStyleLook(table.attrs.tableLook)).toMatchObject({ firstRow: true, firstColumn: false, bandedRows: false });
    expect(table.child(0).child(0).attrs).toMatchObject({ borders: null, shading: null });

    editor.commands.undo();
    expect(editor.state.doc.attrs.wordTableStyleRegistry).toBeNull();
    expect(editor.state.doc.child(0).attrs.tableStyle).toBeNull();
  });

  it("keeps direct formatting on request and rejects unknown styles", () => {
    const editor = createStyledEditor();
    expect(editor.commands.applyWordTableStyle({
      tablePos: 0,
      styleId: "TableGrid",
      mode: "keep-direct-formatting"
    })).toBe(true);
    const table = editor.state.doc.child(0);
    expect(table.attrs.borders).toMatchObject({ top: border });
    expect(table.child(0).child(0).attrs.shading).toMatchObject({ fill: "FFFF00" });
    expect(editor.commands.applyWordTableStyle({ tablePos: 0, styleId: "Unknown" })).toBe(false);
  });

  it("does not replace an imported definition with the built-in one", () => {
    const editor = createStyledEditor();
    const imported = {
      version: 1,
      defaultStyleId: null,
      styles: {
        TableGrid: {
          id: "TableGrid", name: "Table Grid", basedOn: null, isDefault: false, custom: false,
          uiPriority: null, hidden: false, semiHidden: false,
          base: { table: null, row: null, cell: null, paragraph: null, text: null }, regions: {}
        }
      }
    };
    editor.dispatchTransaction(editor.state.pm.tr.setDocAttribute("wordTableStyleRegistry", imported));
    editor.commands.applyWordTableStyle({ tablePos: 0, styleId: "TableGrid" });
    expect(editor.state.doc.attrs.wordTableStyleRegistry).toBe(imported);
  });

  it("toggles look switches", () => {
    const editor = createStyledEditor();
    expect(editor.commands.setWordTableLook({ tablePos: 0, look: { lastRow: true } })).toBe(true);
    expect(resolveWordTableStyleLook(editor.state.doc.child(0).attrs.tableLook)).toMatchObject({
      firstRow: true,
      lastRow: true,
      firstColumn: true
    });
  });
});
