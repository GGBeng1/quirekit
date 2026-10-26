import type * as PMView from "./index";
import { Schema } from "@quirekit/pm-model";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/index.mjs";
const { Decoration, DecorationSet, EditorView } = (await import(distEntry)) as typeof PMView;

describe("pm-view vendored API", () => {
  it("creates decoration sets with vendored model nodes", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "text*" },
        text: {}
      }
    });
    const doc = schema.node("doc", null, [schema.text("hello")]);
    const decoration = Decoration.inline(1, 4, { class: "marked" });
    const set = DecorationSet.create(doc, [decoration]);

    expect(set.find()).toHaveLength(1);
  });

  it("exports the DOM EditorView constructor", () => {
    expect(typeof EditorView).toBe("function");
  });
});
