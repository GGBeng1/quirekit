import {
  Extension,
  QuireEditor
} from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { WordParagraph } from "@quirekit/classic-paragraph-model";
import { describe, expect, it } from "vitest";
import { WordNumbering } from "../extension";
import { createDefaultWordNumberingRegistry } from "../model";
import { resolveWordNumberingMarkers } from "../resolver";
import { decimalDotWordOrderedPresetId } from "./builtins";
import { isWordNumberingPresetActive } from "./query";
import type { WordNumberingPresetContribution } from "./types";

describe("Word numbering preset application", () => {
  it("materializes an extension preset into document state in one transaction", () => {
    const editor = createPresetEditor([singleDecimalPreset("custom.paren")]);
    let transactions = 0;
    editor.on("transaction", () => { transactions += 1; });

    expect(editor.commands.applyWordNumberingPreset({
      presetId: "custom.paren"
    })).toBe(true);
    expect(transactions).toBe(1);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()][0]?.text)
      .toBe("1)");
    expect(isWordNumberingPresetActive(editor, "custom.paren")).toBe(true);
    expect(editor.commands.applyWordNumberingPreset({
      presetId: "custom.paren"
    })).toBe(false);
    expect(editor.commands.applyWordNumberingPreset({ presetId: "missing" }))
      .toBe(false);
  });

  it("compiles and applies one friendly partial template in one transaction", () => {
    const editor = createPresetEditor([]);
    let transactions = 0;
    editor.on("transaction", () => { transactions += 1; });

    expect(editor.commands.applyWordNumberingTemplate({
      draft: {
        scope: "singleLevel",
        id: "user.article-numbering",
        basePresetId: decimalDotWordOrderedPresetId,
        level: {
          text: "Article %1)",
          start: 4,
          suffix: "space"
        }
      }
    })).toBe(true);

    expect(transactions).toBe(1);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()][0]?.text)
      .toBe("Article 4)");
    const reference = editor.state.doc.child(0).attrs.wordNumbering;
    const registry = editor.state.doc.attrs.wordNumberingRegistry;
    const definition = registry.abstractNums[
      registry.nums[reference.numId].abstractNumId
    ];
    expect(definition.levels["0"]).toMatchObject({
      format: "decimal",
      text: "Article %1)",
      start: 4,
      suffix: "space"
    });
  });

  it("copy-on-writes one shared definition and updates the complete concrete sequence", () => {
    const editor = createPresetEditor([singleDecimalPreset("custom.paren")]);
    expect(editor.commands.toggleWordOrderedList()).toBe(true);
    const firstNumId = editor.state.doc.child(0).attrs.wordNumbering.numId;
    moveCursor(editor, 1);
    expect(editor.commands.toggleWordOrderedList()).toBe(true);
    expect(editor.state.doc.child(1).attrs.wordNumbering.numId).toBe(firstNumId);
    moveCursor(editor, 3);
    expect(editor.commands.toggleWordOrderedList()).toBe(true);
    const tailNumId = editor.state.doc.child(3).attrs.wordNumbering.numId;
    expect(tailNumId).not.toBe(firstNumId);

    moveCursor(editor, 0);
    expect(editor.commands.applyWordNumberingPreset({
      presetId: "custom.paren"
    })).toBe(true);

    const registry = editor.state.doc.attrs.wordNumberingRegistry;
    const editedNumId = editor.state.doc.child(0).attrs.wordNumbering.numId;
    expect(editedNumId).not.toBe(firstNumId);
    expect(editor.state.doc.child(1).attrs.wordNumbering.numId).toBe(editedNumId);
    expect(registry.nums[editedNumId].abstractNumId).not.toBe("quirekit-decimal");
    expect(registry.nums[firstNumId].abstractNumId).toBe("quirekit-decimal");
    expect(registry.nums[tailNumId].abstractNumId).toBe("quirekit-decimal");
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()]
      .map((marker) => marker.text)).toEqual(["1)", "2)", "1."]);
  });

  it("remaps a single-level placeholder onto the uniform active level", () => {
    const editor = createPresetEditor([singleDecimalPreset("custom.paren")]);
    expect(editor.commands.toggleWordOrderedList()).toBe(true);
    expect(editor.commands.increaseWordListLevel()).toBe(true);
    expect(editor.commands.applyWordNumberingPreset({
      presetId: "custom.paren"
    })).toBe(true);

    const reference = editor.state.doc.child(0).attrs.wordNumbering;
    const registry = editor.state.doc.attrs.wordNumberingRegistry;
    const definition = registry.abstractNums[
      registry.nums[reference.numId].abstractNumId
    ];
    expect(reference.level).toBe(1);
    expect(definition.levels["1"].text).toBe("%2)");
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()][0]?.text)
      .toBe("1)");
  });

  it("applies and compares one complete nine-level preset", () => {
    const defaults = createDefaultWordNumberingRegistry();
    const ordered = defaults.abstractNums["quirekit-decimal"]!;
    const levels = {
      ...ordered.levels,
      "0": { ...ordered.levels["0"]!, text: "Clause %1)", start: 7 }
    };
    const editor = createPresetEditor([{
      id: "custom.outline",
      kind: "ordered",
      scope: "multilevel",
      levels
    }]);

    expect(editor.commands.applyWordNumberingPreset({
      presetId: "custom.outline"
    })).toBe(true);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()][0]?.text)
      .toBe("Clause 7)");
    expect(isWordNumberingPresetActive(editor, "custom.outline")).toBe(true);
  });

  it("updates task-state authority across an existing concrete sequence", () => {
    const editor = createPresetEditor([singleTaskPreset("custom.task")]);
    expect(editor.commands.toggleWordBulletList()).toBe(true);
    moveCursor(editor, 1);
    expect(editor.commands.toggleWordBulletList()).toBe(true);
    moveCursor(editor, 0);

    expect(editor.commands.applyWordNumberingPreset({
      presetId: "custom.task"
    })).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordNumbering.task)
      .toEqual({ checked: false });
    expect(editor.state.doc.child(1).attrs.wordNumbering.task)
      .toEqual({ checked: false });
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()]
      .map((marker) => marker.text)).toEqual(["☐", "☐"]);
  });
});

/**
 * Creates an editor with one extension-owned preset set.
 *
 * @param presets - Semantic presets returned by the test extension.
 * @returns Editor containing four plain paragraphs.
 */
function createPresetEditor(
  presets: readonly WordNumberingPresetContribution[]
): QuireEditor {
  const custom = Extension.create({
    name: "customNumberingPresets",
    addWordNumberingPresets() {
      return presets;
    }
  });
  return new QuireEditor({
    extensions: [StarterKit, WordParagraph, WordNumbering, custom],
    content: {
      type: "doc",
      content: [
        paragraph("alpha"),
        paragraph("beta"),
        paragraph("separator"),
        paragraph("gamma")
      ]
    }
  });
}

/**
 * Creates one portable decimal-parenthesis preset.
 *
 * @param id - Stable semantic preset id.
 * @returns Complete single-level contribution.
 */
function singleDecimalPreset(id: string): WordNumberingPresetContribution {
  return {
    id,
    kind: "ordered",
    scope: "singleLevel",
    level: {
      format: "decimal",
      text: "%1)",
      start: 1,
      suffix: "tab",
      justification: "start",
      paragraphIndentation: {
        start: { unit: "dxa", value: 720 },
        end: null,
        firstLine: { unit: "dxa", value: -360 }
      }
    }
  };
}

/**
 * Creates one portable task preset.
 *
 * @param id - Stable semantic preset id.
 * @returns Complete single-level task contribution.
 */
function singleTaskPreset(id: string): WordNumberingPresetContribution {
  return {
    id,
    kind: "task",
    scope: "singleLevel",
    level: {
      format: "bullet",
      text: "☐",
      start: 1,
      suffix: "tab",
      justification: "start",
      paragraphIndentation: {
        start: { unit: "dxa", value: 720 },
        end: null,
        firstLine: { unit: "dxa", value: -360 }
      }
    }
  };
}

/**
 * Creates one paragraph JSON node.
 *
 * @param text - Editable paragraph text.
 * @returns Paragraph JSON node.
 */
function paragraph(text: string): Record<string, unknown> {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

/**
 * Moves the cursor to one zero-based top-level paragraph.
 *
 * @param editor - Editor receiving the selection.
 * @param paragraphIndex - Zero-based paragraph index.
 */
function moveCursor(editor: QuireEditor, paragraphIndex: number): void {
  let position = 1;
  for (let index = 0; index < paragraphIndex; index += 1) {
    position += editor.state.doc.child(index).nodeSize;
  }
  editor.view.dispatch(editor.state.pm.tr.setSelection(
    TextSelection.create(editor.state.doc, position)
  ));
}
