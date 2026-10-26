import { createEditor } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { Schema, type Node as PMNode } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { WordTableExtensions, wordTableNodeSpecs } from "../../../schema";
import { WordTableSelection } from "../../../selection";
import type { WordTableBorder } from "../../../types";
import { createWordTableMap } from "../../../map";
import { freshWordTableBorder, freshWordTableBorders } from "../../insert";
import { setWordTableCellBorders } from "../borders";
import { setWordTableCellBorderColor } from "./color";
import { setWordTableCellBorderFormat } from "./format";
import { explicitNilBorder } from "./topology";

const schema = new Schema({ nodes: {
  doc: { content: "block+" }, text: { group: "inline" },
  paragraph: { group: "block", content: "inline*" }, ...wordTableNodeSpecs
} });
const whole = { startRow: 0, startColumn: 0, rowSpan: 2, columnSpan: 2 };
const first = { ...whole, rowSpan: 1, columnSpan: 1 };

/** @param attrs - Direct cell attrs. @returns A readable cell fixture. */
function cell(attrs: Record<string, unknown> = {}) {
  return { type: "wordTableCell", attrs, content: [{ type: "paragraph" }] };
}
/** @param rows - Row cell JSON. @param attrs - Table attrs. @returns Canonical fixture. */
function table(rows = [[cell(), cell()], [cell(), cell()]], attrs: Record<string, unknown> = { borders: freshWordTableBorders }): PMNode {
  return schema.nodeFromJSON({ type: "wordTable", attrs, content: rows.map(content => ({ type: "wordTableRow", content })) });
}
/** @param source - Input table. @param color - Explicit RGB/auto. @param rect - Selected scope. @returns Updated table. */
function recolor(source: PMNode, color = "E5484D", rect = whole): PMNode {
  const result = setWordTableCellBorderColor(source, { ...rect, color });
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}
/** @param border - Single direct top edge. @returns Complete partial-inheritance tuple. */
function top(border: WordTableBorder) {
  return { top: border, right: null, bottom: null, left: null, insideH: null, insideV: null, tl2br: null, tr2bl: null };
}

describe("direct existing table border properties", () => {
  it("patches style and size independently and never fills absent or nil edges", () => {
    const decorated = { ...freshWordTableBorder, color: "112233", themeColor: "accent1", shadow: true };
    const source = table(undefined, { borders: { ...freshWordTableBorders, top: decorated,
      insideH: explicitNilBorder, insideV: explicitNilBorder } });
    const styled = setWordTableCellBorderFormat(source, { ...whole, format: { style: "double" } });
    if (!styled.ok) throw new Error(styled.reason);
    expect(styled.value.firstChild!.firstChild!.attrs.borders.top).toEqual({ ...decorated, style: "double" });
    expect(styled.value.firstChild!.firstChild!.attrs.borders.right).toBeNull();
    expect(styled.value.firstChild!.firstChild!.attrs.borders.bottom).toBeNull();
    const sized = setWordTableCellBorderFormat(styled.value, { ...whole, format: { size: 12 } });
    if (!sized.ok) throw new Error(sized.reason);
    expect(sized.value.firstChild!.firstChild!.attrs.borders.top).toEqual({ ...decorated, style: "double", size: 12 });
    expect(sized.value.attrs.borders.insideV).toEqual(explicitNilBorder);
    expect(setWordTableCellBorderFormat(sized.value, { ...whole, format: { size: 12 } })).toMatchObject({ ok: true, value: sized.value });
  });

  it("keeps no-border edits as true no-ops for every format property", () => {
    const hidden = setWordTableCellBorders(table(), { ...whole, preset: "none", border: null });
    if (!hidden.ok) throw new Error(hidden.reason);
    for (const format of [{ style: "double" as const }, { size: 16 }, { color: "112233" }]) {
      const result = setWordTableCellBorderFormat(hidden.value, { ...whole, format });
      expect(result.ok && result.value).toBe(hidden.value);
    }
  });

  it("updates existing shared owners, retaining their independent unedited fields", () => {
    const red = { ...freshWordTableBorder, color: "FF0000", size: 16 };
    const blue = { ...freshWordTableBorder, color: "0000FF", style: "double" };
    const source = table([[cell({ borders: { ...top(red), right: red } }), cell({ borders: { ...top(blue), left: blue } })], [cell(), cell()]]);
    const result = setWordTableCellBorderFormat(source, { ...first, format: { size: 24 } });
    if (!result.ok) throw new Error(result.reason);
    expect(result.value.child(0).child(0).attrs.borders.right).toEqual({ ...red, size: 24 });
    expect(result.value.child(0).child(1).attrs.borders.left).toEqual({ ...blue, size: 24 });
    expect(result.value.child(0).child(1).attrs.borders.top).toEqual(blue);
  });

  it("rejects invalid or empty formatting patches atomically", () => {
    for (const format of [{}, { style: "nil" }, { size: 0 }, { size: 1.5 }, { size: 97 }, { color: "red" }, { shadow: true }]) {
      expect(setWordTableCellBorderFormat(table(), { ...whole, format: format as any })).toMatchObject({ ok: false, reason: "invalid-content" });
    }
  });

  it("preserves selection and supports dry-run, no-op, undo and read-only for direct size", () => {
    const editor = createEditor({ extensions: [...WordTableExtensions, UndoRedo], content: { type: "doc", content: [table().toJSON()] } });
    const map = createWordTableMap(editor.state.doc.firstChild!);
    editor.commands.setWordTableSelection({ tablePos: 0, anchorCellPos: map.explicitCells[0]!.cellPos, headCellPos: map.explicitCells[3]!.cellPos });
    const before = editor.state.doc;
    const selection = editor.state.pm.selection.toJSON();
    expect(editor.can().setWordTableCellBorderFormat({ format: { size: 12 } })).toBe(true);
    expect(editor.state.doc).toBe(before);
    expect(editor.commands.setWordTableCellBorderFormat({ format: { size: 12 } })).toBe(true);
    expect(editor.state.pm.selection.toJSON()).toEqual(selection);
    const changed = editor.state.doc;
    expect(editor.commands.setWordTableCellBorderFormat({ format: { size: 12 } })).toBe(true);
    expect(editor.state.doc).toBe(changed);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(before)).toBe(true);
    expect(editor.commands.undo()).toBe(false);
    editor.setEditable(false);
    expect(editor.can().setWordTableCellBorderFormat({ format: { style: "double" } })).toBe(false);
    editor.destroy();
  });

  it("immediately recolors inherited visible edges without changing their geometry", () => {
    const source = table();
    const result = recolor(source);
    result.forEach(row => row.forEach(node => {
      for (const edge of ["top", "right", "bottom", "left"]) {
        expect(node.attrs.borders[edge]).toMatchObject({ ...freshWordTableBorder, color: "E5484D" });
      }
    }));
    expect(result.attrs).toEqual(source.attrs);
    expect(recolor(result)).toBe(result);
  });

  it("preserves per-edge style, width, spacing, effects, diagonals and explicit nil", () => {
    const decorated = { ...freshWordTableBorder, style: "double", size: 24, space: 3, shadow: true, frame: true,
      themeColor: "accent1", themeTint: "80", themeShade: "40" };
    const hidden = { ...freshWordTableBorders, insideH: explicitNilBorder, insideV: explicitNilBorder };
    const source = table([[cell({ borders: { ...top(decorated), tl2br: decorated } }), cell()], [cell(), cell()]], { borders: hidden });
    const result = recolor(source);
    const borders = result.firstChild!.firstChild!.attrs.borders;
    expect(borders.top).toEqual({ ...decorated, color: "E5484D", themeColor: null, themeTint: null, themeShade: null });
    expect(borders.tl2br).toEqual(decorated);
    expect(borders.right).toBeNull();
    expect(borders.bottom).toBeNull();
    expect(result.attrs.borders.insideH).toEqual(explicitNilBorder);
    expect(recolor(result, "auto").firstChild!.firstChild!.attrs.borders.top).toMatchObject({ color: "auto", themeColor: null });
  });

  it("updates both equal-authority shared owners without homogenizing their widths", () => {
    const thin = { ...freshWordTableBorder, size: 4 };
    const thick = { ...freshWordTableBorder, size: 16, style: "double" };
    const source = table([[cell({ borders: { ...top(thin), right: thin } }), cell({ borders: { ...top(thin), left: thick } })], [cell(), cell()]]);
    const result = recolor(source, "112233", first);
    expect(result.child(0).child(0).attrs.borders.right).toMatchObject({ size: 4, color: "112233" });
    expect(result.child(0).child(1).attrs.borders.left).toMatchObject({ size: 16, style: "double", color: "112233" });
    expect(result.child(0).child(1).attrs.borders.top).toEqual(thin);
    expect(result.child(1).child(1)).toBe(source.child(1).child(1));
  });

  it("does not resurrect hidden shared borders or elevate weaker owners", () => {
    const source = table([[cell(), cell({ borders: { ...top(explicitNilBorder), left: explicitNilBorder } })], [cell(), cell()]]);
    const result = recolor(source, "112233", first);
    expect(result.child(0).child(0).attrs.borders.right).toBeNull();
    expect(result.child(0).child(1).attrs.borders.left).toEqual(explicitNilBorder);
    const strong = table([[cell(), cell({ borders: { ...top(explicitNilBorder), left: { ...freshWordTableBorder, size: 16 } } })], [cell(), cell()]]);
    const changed = recolor(strong, "112233", first);
    expect(changed.child(0).child(0).attrs.borders.right).toBeNull();
    expect(changed.child(0).child(1).attrs.borders.left).toMatchObject({ size: 16, color: "112233" });
  });

  it("keeps all-hidden tables unchanged, but materializes legacy fallback only on edits", () => {
    const hidden = setWordTableCellBorders(table(), { ...whole, preset: "none", border: null });
    if (!hidden.ok) throw new Error(hidden.reason);
    expect(recolor(hidden.value)).toBe(hidden.value);
    const legacy = table(undefined, {});
    expect(recolor(legacy, "112233", first).attrs.borders).toEqual(freshWordTableBorders);
  });

  it("rejects partial merged long edges atomically and accepts their full extent", () => {
    const source = table([[cell(), cell()], [cell({ colspan: 2, gridSpan: 2 })]]);
    expect(setWordTableCellBorderColor(source, { ...first, color: "123456" })).toMatchObject({ ok: false, reason: "unsupported-border-color" });
    expect(recolor(source).child(1).firstChild!.attrs.borders.top).toMatchObject({ color: "E5484D" });
  });

  it("validates RGB, coordinates and unsupported separated borders without mutation", () => {
    expect(setWordTableCellBorderColor(table(), { ...whole, color: "orange" }).ok).toBe(false);
    expect(setWordTableCellBorderColor(table(), { ...whole, startRow: 0.5, color: "auto" }).ok).toBe(false);
    const spaced = table(undefined, { borders: freshWordTableBorders, cellSpacing: { unit: "dxa", value: 40 } });
    expect(setWordTableCellBorderColor(spaced, { ...whole, color: "auto" })).toMatchObject({ ok: false, reason: "unsupported-border-color" });
    const offset = schema.nodeFromJSON({ type: "wordTable", attrs: { grid: [{ width: null }, { width: null }], borders: freshWordTableBorders },
      content: [{ type: "wordTableRow", attrs: { gridBefore: 1 }, content: [cell()] }] });
    expect(setWordTableCellBorderColor(offset, { ...first, startColumn: 1, color: "112233" })).toMatchObject({ ok: false, reason: "unsupported-border-color" });
  });

  it("synchronizes vertical continuations, allowing mixed inherited colors but not mixed widths", () => {
    const source = table([[cell({ vMerge: "restart", rowspan: 2 }), cell()], [cell({ vMerge: "continue" }), cell()]]);
    const json = source.toJSON();
    const rows = json.content.map((row: Record<string, unknown>, index: number) => ({ ...row, attrs: {
      borders: { ...freshWordTableBorders, left: { ...freshWordTableBorder, color: index ? "112233" : "E5484D" } }
    } }));
    const mixed = schema.nodeFromJSON({ ...json, content: rows });
    const result = recolor(mixed);
    expect(result.child(0).child(0).attrs.borders.left).toMatchObject({ color: "E5484D", size: 4 });
    expect(result.child(1).child(0).attrs.borders).toEqual(result.child(0).child(0).attrs.borders);
    const uneven = schema.nodeFromJSON({ ...json, content: rows.map((row: any, index: number) => ({ ...row,
      attrs: { borders: { ...row.attrs.borders, left: { ...row.attrs.borders.left, size: index ? 16 : 4 } } }
    })) });
    expect(setWordTableCellBorderColor(uneven, { ...whole, color: "123456" })).toMatchObject({ ok: false, reason: "unsupported-border-color" });
  });

  it("preserves structural selection and undoes one color edit through the public command", () => {
    const editor = createEditor({ extensions: [...WordTableExtensions, UndoRedo], content: { type: "doc", content: [table().toJSON()] } });
    const map = createWordTableMap(editor.state.doc.firstChild!);
    editor.commands.setWordTableSelection({ tablePos: 0, anchorCellPos: map.explicitCells[0]!.cellPos, headCellPos: map.explicitCells[3]!.cellPos });
    const before = editor.state.doc;
    const selection = editor.state.pm.selection.toJSON();
    expect(editor.can().setWordTableCellBorderColor({ color: "E5484D" })).toBe(true);
    expect(editor.state.doc).toBe(before);
    expect(editor.commands.setWordTableCellBorderColor({ color: "E5484D" })).toBe(true);
    expect(editor.state.pm.selection).toBeInstanceOf(WordTableSelection);
    expect(editor.state.pm.selection.toJSON()).toEqual(selection);
    expect(editor.commands.setWordTableCellBorderColor({ color: "E5484D" })).toBe(true);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(before)).toBe(true);
    expect(editor.commands.undo()).toBe(false);
    editor.setEditable(false);
    expect(editor.can().setWordTableCellBorderColor({ color: "123456" })).toBe(false);
    editor.destroy();
  });
});
