import { describe, expect, it } from "vitest";
import type { QuireBlockLayoutInput } from "../engine/block-types";
import type { QuireLayoutBox } from "../engine/types";
import { normalizeQuireRetainedBlockLayout, projectQuireRetainedBlockLayout } from "./projection";

describe("retained block projection", () => {
  it("preserves zero-origin identity without admitting structured range shifts", () => {
    const input = { id: "section", range: { from: 0, to: 8 } };
    const box = {
      ...input, rect: { x: 0, y: 0, width: 300, height: 24 },
      children: [{ id: "child", range: { from: 1, to: 7 }, rect: { x: 0, y: 0, width: 300, height: 24 } }]
    };
    const local = normalizeQuireRetainedBlockLayout(box, 0, 0);
    expect(local).toBe(box);
    expect(projectQuireRetainedBlockLayout(local, input, input, 0, 0)).toBe(box);
    expect(projectQuireRetainedBlockLayout(local, input, {
      ...input, range: { from: 1, to: 9 }
    }, 0, 0)).toBeUndefined();
  });

  it("restores only an exact original placement and keeps other origins independent", () => {
    const input = { id: "paragraph", range: { from: 4, to: 8 } };
    const absolute: QuireLayoutBox = {
      ...input, rect: { x: 12, y: 36, width: 300, height: 24 },
      textFragments: [{ id: "text", text: "abc", range: { from: 5, to: 8 },
        rect: { x: 16, y: 38, width: 30, height: 20 }, baseline: 53,
        font: "16px sans-serif", lineHeight: 20,
        caretStops: [{ position: { pos: 5 }, localX: 0 }] }]
    };
    const local = normalizeQuireRetainedBlockLayout(absolute, 12, 36);
    expect(local.rect).toEqual({ x: 0, y: 0, width: 300, height: 24 });
    expect(projectQuireRetainedBlockLayout(local, input, input, 12, 36)).toBe(absolute);
    const moved = projectQuireRetainedBlockLayout(local, input, input, 22, 56)!;
    expect(moved.rect).toEqual({ x: 22, y: 56, width: 300, height: 24 });
    expect(moved.textFragments![0]!.rect).toEqual({ x: 26, y: 58, width: 30, height: 20 });
    expect(projectQuireRetainedBlockLayout(local, input, input, 12, 36)).toBe(absolute);

    const shifted = projectQuireRetainedBlockLayout(local, input, {
      ...input, range: { from: 6, to: 10 }
    }, 12, 36)!;
    expect(shifted).not.toBe(absolute);
    expect(shifted.rect).toEqual(absolute.rect);
    expect(shifted.textFragments![0]!.range).toEqual({ from: 7, to: 10 });
    expect(shifted.textFragments![0]!.caretStops).toEqual([{ position: { pos: 7 }, localX: 0 }]);
    expect(projectQuireRetainedBlockLayout(local, input, {
      ...input, range: { from: 4, to: 9 }
    }, 12, 36)).toBeUndefined();
    expect(absolute.range).toEqual({ from: 4, to: 8 });
    expect(absolute.textFragments![0]!.caretStops[0]!.position.pos).toBe(5);

    const rebuilt = { ...absolute, rect: { ...absolute.rect, height: 48 } };
    const nextLocal = normalizeQuireRetainedBlockLayout(rebuilt, 12, 36);
    expect(projectQuireRetainedBlockLayout(nextLocal, input, input, 12, 36)).toBe(rebuilt);
    expect(projectQuireRetainedBlockLayout(local, input, input, 12, 36)).toBe(absolute);
  });

  it("translates the local subtree only when a moved origin reads it", () => {
    const input = { id: "section", range: { from: 0, to: 8 } };
    let childReads = 0;
    const absolute = {
      ...input, rect: { x: 12, y: 36, width: 300, height: 48 },
      get children() {
        childReads += 1;
        return [{ id: "child", range: { from: 1, to: 7 }, rect: { x: 12, y: 36, width: 300, height: 24 } }];
      }
    } as unknown as QuireLayoutBox;
    const local = normalizeQuireRetainedBlockLayout(absolute, 12, 36);
    expect(local.rect).toEqual({ x: 0, y: 0, width: 300, height: 48 });
    expect(projectQuireRetainedBlockLayout(local, input, input, 12, 36)).toBe(absolute);
    expect(childReads).toBe(0);

    const moved = projectQuireRetainedBlockLayout(local, input, input, 12, 60)!;
    expect(childReads).toBeGreaterThan(0);
    expect((moved as unknown as { children: readonly QuireLayoutBox[] }).children[0]!.rect)
      .toEqual({ x: 12, y: 60, width: 300, height: 24 });
  });

  it("restores absolute x before remapping a range-shifted local leaf", () => {
    const retainedInput: QuireBlockLayoutInput = {
      id: "paragraph-1",
      range: { from: 4, to: 8 },
      layoutSignature: "paragraph-1"
    };
    const currentInput: QuireBlockLayoutInput = {
      ...retainedInput,
      range: { from: 6, to: 10 }
    };
    const localBox: QuireLayoutBox = {
      id: "paragraph-1",
      range: retainedInput.range,
      rect: { x: 0, y: 0, width: 300, height: 24 },
      textFragments: [
        {
          id: "paragraph-1:text-0",
          text: "abc",
          range: { from: 5, to: 8 },
          rect: { x: 4, y: 2, width: 30, height: 20 },
          font: "16px sans-serif",
          lineHeight: 20,
          baseline: 17,
          caretStops: []
        }
      ]
    };

    const projected = projectQuireRetainedBlockLayout(
      localBox,
      retainedInput,
      currentInput,
      10,
      52
    );

    expect(projected?.rect).toEqual({ x: 10, y: 52, width: 300, height: 24 });
    expect(projected?.range).toEqual({ from: 6, to: 10 });
    expect(projected?.textFragments?.[0]?.rect).toEqual({
      x: 14,
      y: 54,
      width: 30,
      height: 20
    });
    expect(projected?.textFragments?.[0]?.range).toEqual({ from: 7, to: 10 });
  });
});
