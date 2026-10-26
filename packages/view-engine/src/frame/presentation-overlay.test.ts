import { createEditor } from "@quirekit/core";
import { Transform } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { createQuireViewEngineRuntime } from "./runtime";
import type { QuirePresentationOverlay } from "./types";

const viewportRect = { x: 0, y: 0, width: 480, height: 300 };

/** @returns Editor with one paragraph "Hello world". */
function createFixture() {
  return createEditor({
    extensions: [StarterKit.configure({ undoRedo: false })],
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }]
    }
  });
}

/**
 * Builds a "replace world with there" overlay: old text kept as removed, new text inserted.
 *
 * @param editor - Fixture editor.
 * @returns Overlay planned against the current document.
 */
function createReplaceOverlay(editor: ReturnType<typeof createFixture>): QuirePresentationOverlay {
  const baseDoc = editor.state.doc;
  const transform = new Transform(baseDoc).insert(12, editor.schema.text("there"));
  return {
    baseDoc,
    steps: transform.steps,
    ranges: [
      { from: 7, to: 12, role: "removed" },
      { from: 12, to: 17, role: "inserted" }
    ]
  };
}

describe("presentation overlay frames", () => {
  it("renders overlay steps and role styles without changing the canonical state", () => {
    const editor = createFixture();
    const committed = editor.state;
    const frame = createQuireViewEngineRuntime({ editor }).buildFrame({
      viewportRect,
      presentationOverlay: createReplaceOverlay(editor)
    });

    expect(frame.layoutSnapshot.state.doc.textContent).toBe("Hello worldthere");
    expect(editor.state).toBe(committed);
    expect(frame.decorationLane.textStyles).toContainEqual(expect.objectContaining({
      range: { from: 7, to: 12 },
      textDecoration: [expect.objectContaining({ kind: "strikethrough" })]
    }));
    expect(frame.decorationLane.textStyles).toContainEqual(expect.objectContaining({
      range: { from: 12, to: 17 },
      textDecoration: [expect.objectContaining({ kind: "underline" })]
    }));
    expect(frame.decorationLane.backgrounds.some((visual) => visual.range.from === 12)).toBe(true);
  });

  it("ignores an overlay planned against another document", () => {
    const editor = createFixture();
    const overlay = createReplaceOverlay(editor);
    editor.commands.insertContentAt(1, "Say ");
    const frame = createQuireViewEngineRuntime({ editor }).buildFrame({
      viewportRect,
      presentationOverlay: overlay
    });

    expect(frame.layoutSnapshot.state.doc).toBe(editor.state.doc);
    expect(frame.decorationLane.textStyles).toHaveLength(0);
  });

  it("applies custom role styles and paints changed ranges as background only", () => {
    const editor = createFixture();
    const frame = createQuireViewEngineRuntime({ editor }).buildFrame({
      viewportRect,
      presentationOverlay: {
        baseDoc: editor.state.doc,
        steps: [],
        ranges: [{ from: 1, to: 6, role: "changed" }],
        styles: { changed: { background: "#abcdef" } }
      }
    });

    expect(frame.decorationLane.backgrounds).toContainEqual(expect.objectContaining({
      range: { from: 1, to: 6 },
      background: "#abcdef"
    }));
    expect(frame.decorationLane.textStyles).toHaveLength(0);
  });

  it("places IME preedit after overlay content and shifts later role ranges", () => {
    const editor = createFixture();
    const frame = createQuireViewEngineRuntime({ editor }).buildFrame({
      viewportRect,
      presentationOverlay: createReplaceOverlay(editor),
      imePreedit: { range: { from: 1, to: 1 }, text: "ab" }
    });

    expect(frame.layoutSnapshot.state.doc.textContent).toBe("abHello worldthere");
    expect(frame.decorationLane.textStyles).toContainEqual(expect.objectContaining({
      range: { from: 14, to: 19 },
      textDecoration: [expect.objectContaining({ kind: "underline" })]
    }));
  });
});
