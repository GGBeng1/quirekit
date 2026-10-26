import { createEditor } from "@quirekit/core";
import { readBlockCatalog } from "@quirekit/extensions";
import { describe, expect, it } from "vitest";
import { ClassicEditorKit } from "../../../extensions";
import type {
  ClassicEditorLocale,
  ClassicEditorRenderContext,
  ClassicEditorUiSemanticSnapshot
} from "../../../types";
import { resolveClassicEditorTargetStatus } from "./language";
import { classicEditorStatusTargetKey } from "./types";

describe("Classic target-aware status language", () => {
  it("counts structural blocks without confusing their boundary tokens with characters", () => {
    const editor = createTextEditor();
    const catalog = readBlockCatalog(editor)!, block = catalog.blocks[0]!;
    editor.commands.selectBlockRange({ anchor: block, focus: block, expectedDocumentRevision: catalog.revision });
    expect(resolveClassicEditorTargetStatus(createContext(editor, "en"))).toEqual({ kind: "blocks", source: "block-selection", text: "Selected blocks: 1" });
    editor.destroy();
  });
  it("prefers structured table facts over the current text caret", () => {
    const editor = createTextEditor();
    const context = createContext(editor, "zh-CN", {
      [classicEditorStatusTargetKey]: {
        kind: "table",
        rows: 3,
        columns: 4,
        row: 2,
        column: 3,
        mode: "edit"
      }
    });

    expect(resolveClassicEditorTargetStatus(context)).toEqual({
      kind: "table",
      source: "semantic",
      text: "表格 3 行 × 4 列，第 2 行第 3 列 · 编辑模式"
    });
  });

  it("keeps control, story, lock, and disabled reason language target-specific", () => {
    const editor = createTextEditor();
    const control = resolveClassicEditorTargetStatus(createContext(editor, "en", {
      [classicEditorStatusTargetKey]: {
        kind: "control",
        label: "Checkbox",
        mode: "fill",
        locked: true,
        reason: "Owner approval required"
      }
    }));
    const story = resolveClassicEditorTargetStatus(createContext(editor, "zh-CN", {
      [classicEditorStatusTargetKey]: {
        kind: "story",
        label: "页眉",
        mode: "read-only"
      }
    }));

    expect(control.text).toBe(
      "Control: Checkbox · Fill mode · Locked · Owner approval required"
    );
    expect(story.text).toBe("文档区域：页眉 · 只读模式");
  });

  it("counts only a proven Core text selection when semantic facts are absent", () => {
    const editor = createTextEditor();
    editor.commands.setTextSelection({ from: 1, to: 5 });

    expect(resolveClassicEditorTargetStatus(createContext(editor, "zh-CN")).text)
      .toBe("已选择 4 个字符");
  });

  it("fails honestly for a non-text selection without structured target facts", () => {
    const editor = createTextEditor();
    const context = createContext(editor, "en");
    const nonTextContext = {
      ...context,
      editor: {
        ...context.editor,
        state: { pm: { selection: { from: 1, to: 2, empty: false } } }
      }
    } as unknown as ClassicEditorRenderContext;

    expect(resolveClassicEditorTargetStatus(nonTextContext)).toEqual({
      kind: "unavailable",
      source: "fallback",
      text: "Selection details are unavailable"
    });
  });
});

/** @returns Headless Core editor with a stable paragraph text selection. */
function createTextEditor() {
  return createEditor({
    extensions: [ClassicEditorKit],
    content: { type: "doc", content: [{
      type: "paragraph",
      content: [{ type: "text", text: "Status language" }]
    }] }
  });
}

/**
 * Creates the render-context subset consumed by target status language.
 *
 * @param editor - Mounted or headless Core editor authority.
 * @param locale - Product interface locale.
 * @param values - Structured semantic values.
 * @returns Status render context.
 */
function createContext(
  editor: ReturnType<typeof createTextEditor>,
  locale: ClassicEditorLocale,
  values: Readonly<Record<string, unknown>> = {}
): ClassicEditorRenderContext {
  const semantic = {
    selection: null,
    target: null,
    values,
    mixed: [],
    can: {},
    reasons: {},
    busy: [],
    geometry: null,
    freshness: 1
  } satisfies ClassicEditorUiSemanticSnapshot;
  return {
    editor,
    locale,
    ui: { state: { semantic } }
  } as unknown as ClassicEditorRenderContext;
}
