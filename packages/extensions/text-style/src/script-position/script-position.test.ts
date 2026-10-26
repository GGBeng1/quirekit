import {
  createEditor,
  getExtensionField,
  type QuireMarkCanvasStyleResolver
} from "@quirekit/core";
import {
  docx,
  type DocxMarkExportContext,
  type DocxMarkImportContext
} from "@quirekit/lit-docx-contract";
import { describe, expect, it, vi } from "vitest";
import { DoubleStrike } from "../double-strike";
import { doubleStrikeDocxCodec } from "../double-strike/docx";
import { createTextStyleTestExtensions } from "../testing/extensions";
import { subscriptDocxCodec, superscriptDocxCodec } from "./docx";
import { Subscript, Superscript } from "./script-position";

type QuireMark = {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>> | undefined;
};

describe("script-position and double-strike marks", () => {
  it("applies mutually exclusive script positions and strike families", () => {
    const editor = createEditor({
      extensions: [
        ...createTextStyleTestExtensions(),
        DoubleStrike,
        Superscript,
        Subscript
      ],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "AB" }]
        }]
      }
    });

    editor.commands.setTextSelection({ from: 1, to: 2 });
    expect(editor.commands.setSuperscript()).toBe(true);
    expect(editor.commands.setSubscript()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toEqual([
      { type: "subscript" }
    ]);

    expect(editor.commands.setStrike()).toBe(true);
    expect(editor.commands.setDoubleStrike()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toEqual([
      { type: "doubleStrike" },
      { type: "subscript" }
    ]);

    const subscript = editor.extensions.find((item) => item.name === "subscript");
    const doubleStrike = editor.extensions.find((item) => item.name === "doubleStrike");
    const marks = editor.state.doc.firstChild?.firstChild?.marks ?? [];
    const subscriptMark = marks.find((mark) => mark.type.name === "subscript");
    const doubleStrikeMark = marks.find((mark) => mark.type.name === "doubleStrike");
    expect(readCanvasStyle(subscript, subscriptMark)).toEqual({
      fontScale: 0.65,
      baselineShiftEm: -0.15
    });
    expect(readCanvasStyle(doubleStrike, doubleStrikeMark)).toEqual({
      textDecoration: ["double-line-through"]
    });

    editor.destroy();
  });

  it("round-trips semantic LitAST marks through their DOCX codecs", () => {
    for (const [codec, type] of [
      [superscriptDocxCodec, "superscript"],
      [subscriptDocxCodec, "subscript"],
      [doubleStrikeDocxCodec, "doubleStrike"]
    ] as const) {
      const imported = codec.import!.convert(createImportContext({ type }))[0]!;
      expect(imported).toEqual({ type });
      expect(codec.export!.convert(createExportContext(imported))).toEqual([{ type }]);
    }
  });
});

/**
 * Resolves one installed mark's fixed-layout style.
 *
 * @param extension - Installed mark extension.
 * @param mark - Runtime mark instance.
 * @returns Resolved canvas style or undefined.
 */
function readCanvasStyle(
  extension: ReturnType<typeof createEditor>["extensions"][number] | undefined,
  mark: Parameters<QuireMarkCanvasStyleResolver>[0] | undefined
) {
  if (extension === undefined || mark === undefined) return undefined;
  return getExtensionField<QuireMarkCanvasStyleResolver>(extension, "canvasStyle")?.(mark);
}

/**
 * Creates one isolated mark import context.
 *
 * @param mark - LitAST source mark.
 * @returns Strict import context.
 */
function createImportContext(
  mark: QuireMark
): DocxMarkImportContext<QuireMark> {
  return {
    mark,
    path: "document.children[0].marks[0]",
    lossPolicy: "strict",
    resolveService: () => undefined,
    docx,
    composeAttributes: (_modelType, _source, builtIn = {}) => builtIn,
    report: vi.fn()
  };
}

/**
 * Creates one isolated mark export context.
 *
 * @param mark - Canonical Quire mark.
 * @returns Strict export context.
 */
function createExportContext(
  mark: QuireMark
): DocxMarkExportContext<QuireMark> {
  return {
    mark,
    path: "document.content[0].marks[0]",
    lossPolicy: "strict",
    resolveService: () => undefined,
    docx,
    composeAttributes: (_litType, _source, builtIn = {}) => builtIn,
    report: vi.fn()
  };
}
