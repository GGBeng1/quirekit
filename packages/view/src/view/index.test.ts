import { createEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { createQuireView } from ".";

describe("QuireView", () => {
  it("captures editor state in a view snapshot", () => {
    const editor = createEditor();
    const view = createQuireView({ editor, devicePixelRatio: 2 });

    expect(view.snapshot().state.doc.type.name).toBe("doc");
    expect(view.snapshot().devicePixelRatio).toBe(2);
  });

  it("defaults canvas snapshots to a 2x backing-store scale", () => {
    const editor = createEditor();
    const view = createQuireView({ editor });

    expect(view.snapshot().devicePixelRatio).toBe(2);
  });
});
