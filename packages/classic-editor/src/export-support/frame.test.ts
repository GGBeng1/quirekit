import { createEditor, type QuireEditor } from "@quirekit/core";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireDisplayCommand } from "@quirekit/renderer";
import { StarterKit } from "@quirekit/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { buildClassicEditorFixedLayoutFrame } from "./frame";
import { resolveClassicEditorFixedLayoutGeometry } from "./geometry";

const editors: QuireEditor[] = [];
const textMeasurer: QuireTextMeasurer = {
  measureText(text) {
    return { width: Array.from(text).length * 8 };
  }
};

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("Classic fixed-layout frame compilation", () => {
  it("freezes ordered, content-only physical pages", () => {
    const editor = createParagraphEditor(["One", "Two", "Three"]);
    const geometry = resolveClassicEditorFixedLayoutGeometry(editor, {
      pageRect: { x: 0, y: 0, width: 300, height: 80 },
      bodyRect: { x: 10, y: 10, width: 280, height: 32 },
      pageGap: 12
    });
    const frame = buildClassicEditorFixedLayoutFrame({
      editor,
      geometry,
      textMeasurer
    });

    expect(frame.pages.length).toBeGreaterThan(1);
    expect(frame.pages.map((page) => page.pageIndex)).toEqual(
      frame.pages.map((_, index) => index)
    );
    expect(Object.isFrozen(frame)).toBe(true);
    expect(Object.isFrozen(frame.pages)).toBe(true);
    expect(frame.textMeasurer).toBe(textMeasurer);

    const commands = frame.pages.flatMap((page) =>
      flattenCommands(page.contentDisplayList.commands)
    );
    expect(commands.length).toBeGreaterThan(0);
    expect(commands.some((command) => command.kind === "caret")).toBe(false);
    expect(commands.some((command) => command.layer === "overlay")).toBe(false);
  });
});

/**
 * Creates a Starter Kit editor with one paragraph per input string.
 *
 * @param texts - Paragraph text values.
 * @returns Headless canonical editor tracked for cleanup.
 */
function createParagraphEditor(texts: readonly string[]): QuireEditor {
  const editor = createEditor({
    extensions: [StarterKit.configure({ undoRedo: false })]
  });
  const paragraph = editor.state.schema.nodes.paragraph;
  const doc = editor.state.schema.nodes.doc;
  if (paragraph === undefined || doc === undefined) {
    throw new Error("Starter Kit did not provide paragraph/document nodes.");
  }
  editor.setContent(doc.create(
    null,
    texts.map((text) => paragraph.create(
      null,
      editor.state.schema.text(text)
    ))
  ));
  editors.push(editor);
  return editor;
}

/**
 * Flattens nested clip commands for presentation-layer assertions.
 *
 * @param commands - Commands to flatten.
 * @returns Flat command list.
 */
function flattenCommands(
  commands: readonly QuireDisplayCommand[]
): readonly QuireDisplayCommand[] {
  return commands.flatMap((command) => command.kind === "clip"
    ? [command, ...flattenCommands(command.commands)]
    : [command]
  );
}
