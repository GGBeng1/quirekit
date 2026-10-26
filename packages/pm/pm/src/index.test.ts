import type * as PM from "./index";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/index.mjs";
const { Schema } = (await import(distEntry)) as typeof PM;

describe("pm aggregate", () => {
  it("re-exports vendored model APIs", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "text*" },
        text: {}
      }
    });

    expect(schema.node("doc", null, [schema.text("hello")]).textContent).toBe("hello");
  });
});
