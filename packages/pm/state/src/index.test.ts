import type * as PMState from "./index";
import { Schema } from "@quirekit/pm-model";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/index.mjs";
const { EditorState } = (await import(distEntry)) as typeof PMState;

describe("pm-state vendored API", () => {
  it("creates and applies editor transactions", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "text*" },
        text: {}
      }
    });
    const state = EditorState.create({
      schema,
      doc: schema.node("doc", null, [schema.text("hello")])
    });
    const next = state.apply(state.tr.insertText("!", state.doc.content.size));

    expect(state.doc.textContent).toBe("hello");
    expect(next.doc.textContent).toBe("hello!");
  });
});
