import { createEditor, type QuireEditorState } from "@quirekit/core";
import {
  Decoration,
  DecorationSet,
  type EditorState
} from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { buildQuireLayoutSnapshot } from "../editor-layout";
import { buildQuireDisplayList } from "../display-list";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { buildQuireDecorationLane } from "./lane";
import type { QuireDecorationSourceView } from "./types";

const fixedMeasurer: QuireTextMeasurer = {
  measureText: (text) => ({ width: Array.from(text).length * 10 })
};

describe("speculative decoration state", () => {
  it("keeps a paint-replaced checkbox attached after IME preedit insertion", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "A☒B" }]
        }]
      }
    });
    const committedState = editor.state;
    const speculativePmState = committedState.pm.apply(
      committedState.pm.tr.insertText("输入", 2)
    );
    const speculativeState: QuireEditorState = {
      pm: speculativePmState,
      doc: speculativePmState.doc,
      schema: speculativePmState.schema,
      extensions: committedState.extensions,
      storage: committedState.storage
    };
    let decorationProviderState: EditorState | undefined;
    const view: QuireDecorationSourceView = {
      state: committedState.pm,
      someProp(_propName, consume) {
        consume((state: EditorState) => {
          decorationProviderState = state;
          const checkboxFrom = state.doc.textContent.indexOf("☒") + 1;
          return DecorationSet.create(state.doc, [
            Decoration.inline(1, state.doc.textContent.length + 1, {
              "data-test-field": "true",
              style: "background-color: rgba(37, 99, 235, 0.045)"
            }),
            Decoration.inline(checkboxFrom, checkboxFrom + 1, {
              "data-qk-decoration-control": "checkbox",
              "data-qk-decoration-checked": "true",
              "data-qk-decoration-persistence": "content",
              "data-qk-decoration-text-paint": "suppress",
              style: "background-color: transparent; color: transparent"
            })
          ]);
        });
        return undefined;
      }
    };
    const snapshot = buildQuireLayoutSnapshot({
      state: speculativeState,
      viewportRect: { x: 10, y: 20, width: 300, height: 200 },
      textMeasurer: fixedMeasurer
    });
    const lane = buildQuireDecorationLane({
      snapshot,
      view,
      theme: new Map()
    });
    const commands = buildQuireDisplayList({
      snapshot,
      decorationLane: lane
    }).commands;

    expect(decorationProviderState).toBe(speculativePmState);
    expect(lane.textStyles).toEqual([
      expect.objectContaining({
        range: { from: 4, to: 5 },
        suppressTextPaint: true
      })
    ]);
    expect(lane.backgrounds.find((background) => (
      background.attrs["data-test-field"] === "true"
    ))).toEqual(expect.objectContaining({
      range: { from: 1, to: 6 }
    }));
    expect(commands.filter((command) => (
      (command.kind === "text" || command.kind === "glyph-run")
      && command.range?.from === 4
      && command.range?.to === 5
    ))).toEqual([]);
    expect(commands.filter((command) => command.id.includes("checkbox-")))
      .toHaveLength(3);

    editor.destroy();
  });
});
