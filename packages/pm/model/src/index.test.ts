import type * as PMModel from "./index";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/index.mjs";
const { Fragment, Schema, Slice } = (await import(distEntry)) as typeof PMModel;

describe("pm-model vendored API", () => {
  it("creates schema nodes and marks with stable JSON output", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "block+" },
        paragraph: { content: "text*", group: "block" },
        text: { group: "inline" }
      },
      marks: {
        strong: {}
      }
    });

    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("hello", [schema.mark("strong")])])
    ]);

    expect(doc.type.name).toBe("doc");
    expect(doc.toJSON()).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "strong" }],
              text: "hello"
            }
          ]
        }
      ]
    });
  });

  it("joins adjacent text nodes when creating fragments and slices", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "text*" },
        text: {}
      }
    });
    const fragment = Fragment.fromArray([schema.text("hello"), schema.text(" world")]);
    const slice = new Slice(fragment, 0, 0);

    expect(fragment.childCount).toBe(1);
    expect(fragment.textBetween(0, fragment.size, "")).toBe("hello world");
    expect(slice.size).toBe(11);
    expect(slice.openStart).toBe(0);
    expect(slice.openEnd).toBe(0);
  });
});
