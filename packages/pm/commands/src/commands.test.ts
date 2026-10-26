import type * as PMCommands from "./commands";
import { Schema } from "@quirekit/pm-model";
import { EditorState, TextSelection } from "@quirekit/pm-state";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/commands.mjs";
const { deleteSelection } = (await import(distEntry)) as typeof PMCommands;

describe("pm-commands vendored API", () => {
  it("deletes the current selection with command dispatch", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "block+" },
        paragraph: { content: "text*", group: "block" },
        text: { group: "inline" }
      }
    });
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("hello")])
    ]);
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 1, 6)
    });
    let next = state;

    const handled = deleteSelection(state, transaction => {
      next = state.apply(transaction);
    });

    expect(handled).toBe(true);
    expect(next.doc.textContent).toBe("");
  });
});
