import type * as PMTransform from "./index";
import { Schema } from "@quirekit/pm-model";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/index.mjs";
const { Transform } = (await import(distEntry)) as typeof PMTransform;

describe("pm-transform vendored API", () => {
  it("applies text insertions through a transform", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "text*" },
        text: {}
      }
    });
    const doc = schema.node("doc", null, [schema.text("hello")]);
    const transform = new Transform(doc).insert(doc.content.size, schema.text("!"));

    expect(transform.doc.textContent).toBe("hello!");
    expect(transform.steps).toHaveLength(1);
  });
});
