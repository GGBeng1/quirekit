import { describe, expect, it } from "vitest";
import { selectionPreset } from "./presets";

describe("selection presets", () => {
  it("delegates container contents and claims only complete crossings", () => {
    const contribution = selectionPreset.container({ id: "editable-callout", nodeTypes: ["callout"] });
    expect(contribution.adapter.modes).toEqual({ internal: "delegate", entry: "delegate", exit: "delegate", fullyCrossed: "owner" });
    expect(contribution.adapter.compileUnits({ node: { nodeSize: 4 } as never, position: 8 })).toEqual([]);
    expect(contribution.layoutDependency).toEqual({ kind: "document" });
    expect(contribution.adapter.mappingFallback).toBe("text");
    expect(contribution.adapter.replacementFallback).toBe("text");
  });

  it("keeps inline owners in ordinary text semantics", () => {
    const contribution = selectionPreset.inline({
      id: "inline-image",
      nodeTypes: ["image"]
    });

    expect(contribution.adapter.modes).toEqual({
      internal: "delegate",
      entry: "delegate",
      exit: "delegate",
      fullyCrossed: "delegate"
    });
    expect(contribution.adapter.compileUnits({
      node: { nodeSize: 1 } as never,
      position: 8
    })).toEqual([]);
  });

  it("selects atomic blocks as one indivisible owner", () => {
    const contribution = selectionPreset.atomicBlock({
      id: "atomic-callout",
      nodeTypes: ["callout"]
    });

    expect(contribution.adapter.modes).toEqual({
      internal: "owner",
      entry: "owner",
      exit: "owner",
      fullyCrossed: "owner"
    });
    expect(contribution.adapter.compileUnits({
      node: { nodeSize: 12 } as never,
      position: 8
    })).toEqual([{
      id: "owner",
      kind: "owner",
      range: { from: 0, to: 12 }
    }]);
    expect(contribution.adapter.mappingFallback).toBe("nearest");
    expect(contribution.adapter.replacementFallback).toBe("owner");
  });

  it("owns the safe crossing matrix for semantic units", () => {
    const contribution = selectionPreset.semanticUnits({
      id: "rows",
      nodeTypes: ["table"],
      priority: 200,
      commandDomain: "table",
      clipboardDomain: "table",
      compileUnits: () => [{
        id: "row-0",
        kind: "row",
        range: { from: 1, to: 5 }
      }]
    });

    expect(contribution.priority).toBe(200);
    expect(contribution.adapter.modes).toEqual({
      internal: "delegate",
      entry: "semantic-units",
      exit: "semantic-units",
      fullyCrossed: "owner"
    });
    expect(contribution.adapter.commandDomain).toBe("table");
    expect(contribution.adapter.clipboardDomain).toBe("table");
    expect(contribution.adapter.mappingFallback).toBe("text");
    expect(contribution.adapter.replacementFallback).toBe("reject");
  });

  it("excludes skipped owners without requiring semantic units", () => {
    const contribution = selectionPreset.skip({
      id: "generated-chrome",
      nodeTypes: ["chrome"]
    });

    expect(contribution.adapter.modes).toEqual({
      internal: "skip",
      entry: "skip",
      exit: "skip",
      fullyCrossed: "skip"
    });
    expect(contribution.adapter.mappingFallback).toBe("remove");
    expect(contribution.adapter.replacementFallback).toBe("reject");
  });
});
