import type * as PMHistory from "./history";
import { Schema } from "@quirekit/pm-model";
import { EditorState } from "@quirekit/pm-state";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/history.mjs";
const { history, redo, undo } = (await import(distEntry)) as typeof PMHistory;

describe("pm-history vendored API", () => {
  it("tracks undo and redo through editor state", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "text*" },
        text: {}
      }
    });
    const state = EditorState.create({ schema, plugins: [history()] });
    const inserted = state.apply(state.tr.insertText("hello", 0));
    let undone = inserted;

    expect(undo(inserted, transaction => {
      undone = inserted.apply(transaction);
    })).toBe(true);
    expect(undone.doc.textContent).toBe("");

    let redone = undone;
    expect(redo(undone, transaction => {
      redone = undone.apply(transaction);
    })).toBe(true);
    expect(redone.doc.textContent).toBe("hello");
  });
});
