import { describe, expect, it } from "vitest";
import { createWordParagraphModelSemantics } from "./paragraph-model";

const model = createWordParagraphModelSemantics();

describe("Word paragraph model semantics", () => {
  it("uses paragraph size plus grid spacing for relative indents and snaps strict totals", () => {
    const source = { firstLine: { unit: "character", value: 200 }, start: { unit: "dxa", value: 300 }, end: null };
    for (const [size, spaced, snapped] of [[8, 20, 18], [16, 36, 36], [24, 52, 54]]) {
      expect(model.resolveIndentation(source, size!, { mode: "spacing", spacing: 2, pitch: 18 }))
        .toEqual({ firstLine: spaced, start: 20, end: 0 });
      expect(model.resolveIndentation(source, size!, { mode: "cells", spacing: 2, pitch: 18 }))
        .toEqual({ firstLine: snapped, start: 20, end: 0 });
    }
    expect(model.resolveIndentation({ start: null, end: null, firstLine: { unit: "character", value: -200 } }, 8,
      { mode: "cells", spacing: 2, pitch: 18 }).firstLine).toBe(-18);
  });

  it("converts twip indentation into CSS pixels", () => {
    expect(model.resolveIndentation({
      start: { unit: "dxa", value: 240 },
      end: { unit: "dxa", value: 120 },
      firstLine: { unit: "dxa", value: -240 }
    }, 16)).toEqual({ start: 16, end: 8, firstLine: -16 });
  });

  it("resolves character-relative indentation against the supplied pitch", () => {
    expect(model.resolveIndentation({
      start: { unit: "character", value: 200 },
      end: null,
      firstLine: { unit: "character", value: 100 }
    }, 32)).toEqual({ start: 64, end: 0, firstLine: 32 });
  });

  it("reads direct indentation from paragraph attrs and defaults missing attrs to zero", () => {
    const indented = { attrs: { wordParagraph: { indentation: { start: { unit: "dxa", value: 360 }, end: null, firstLine: null } } } };
    const plain = { attrs: {} };

    expect(model.resolveIndentation(model.nodeIndentation(indented as never), 16)).toEqual({ start: 24, end: 0, firstLine: 0 });
    expect(model.resolveIndentation(model.nodeIndentation(plain as never), 16)).toEqual({ start: 0, end: 0, firstLine: 0 });
  });
});
