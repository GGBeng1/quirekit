import { describe, expect, it, vi } from "vitest";
import {
  layoutQuireBlockFlowContainer,
  layoutQuireBlockFlowInputUncached,
  type QuireBlockFlowBox,
  type QuireBlockFlowInput
} from ".";

const services = {
  resolveChildren: (input: QuireBlockFlowInput) => input.children,
  isSpecialized: () => false,
  layoutSpecialized: () => undefined,
  decorateBox: (_input: QuireBlockFlowInput, box: QuireBlockFlowBox) => box
};

describe("layoutQuireBlockFlowContainer", () => {
  it("lays out source-order children with explicit spacing", () => {
    const result = layoutQuireBlockFlowContainer({
      id: "body",
      range: { from: 0, to: 4 },
      rect: { x: 20, y: 40, width: 300, height: 0 },
      blockHeight: 10,
      blockGap: 4,
      children: [
        {
          id: "a",
          range: { from: 0, to: 2 },
          minHeight: 12,
          spacingAfter: 3
        },
        {
          id: "b",
          range: { from: 2, to: 4 },
          minHeight: 8,
          spacingBefore: 2
        }
      ],
      ...services
    });

    expect(result.children.map((child) => child.rect)).toEqual([
      { x: 20, y: 40, width: 300, height: 15 },
      { x: 20, y: 59, width: 300, height: 8 }
    ]);
    expect(result.rect).toEqual({ x: 20, y: 40, width: 300, height: 27 });
  });

  it("keeps non-collapsing block insets outside collapsed sibling spacing", () => {
    const result = layoutQuireBlockFlowContainer({
      id: "body",
      range: { from: 0, to: 4 },
      rect: { x: 0, y: 0, width: 200, height: 0 },
      blockHeight: 10,
      blockGap: 0,
      children: [
        {
          id: "a",
          range: { from: 0, to: 2 },
          minHeight: 10,
          spacingAfter: 6,
          blockEndInset: 2
        },
        {
          id: "b",
          range: { from: 2, to: 4 },
          minHeight: 10,
          spacingBefore: 6,
          blockStartInset: 3
        }
      ],
      ...services
    });

    expect(result.children.map((child) => child.rect)).toEqual([
      { x: 0, y: 0, width: 200, height: 21 },
      { x: 0, y: 21, width: 200, height: 10 }
    ]);
    expect(result.rect.height).toBe(31);
  });

  it("forwards renderer-neutral pagination policy to leaf boxes", () => {
    const pagination = {
      breakBefore: "page",
      keepTogether: true,
      keepWithNext: true,
      widows: 2,
      orphans: 2
    } as const;
    const result = layoutQuireBlockFlowInputUncached({
      input: {
        id: "paragraph",
        range: { from: 0, to: 3 },
        minHeight: 18,
        pagination
      },
      x: 8,
      y: 16,
      width: 240,
      blockHeight: 10,
      blockGap: 0,
      ...services
    });

    expect(result.pagination).toEqual(pagination);
  });

  it("delegates specialized descendants without retaining their ancestor", () => {
    const get = vi.fn(() => ({
      id: "section",
      range: { from: 0, to: 4 },
      rect: { x: 0, y: 0, width: 200, height: 1 }
    }));
    const setContainer = vi.fn();
    const specialized: QuireBlockFlowInput = {
      id: "table",
      range: { from: 1, to: 3 }
    };
    const section: QuireBlockFlowInput = {
      id: "section",
      range: { from: 0, to: 4 },
      children: [specialized]
    };
    const result = layoutQuireBlockFlowContainer({
      id: "body",
      range: { from: 0, to: 4 },
      rect: { x: 0, y: 0, width: 200, height: 0 },
      blockHeight: 10,
      blockGap: 0,
      children: [section],
      cache: {
        get,
        set: () => undefined,
        setContainer
      },
      resolveChildren: (input) => input.children,
      isSpecialized: (input) => input.id === specialized.id,
      layoutSpecialized: ({ input, x, y, width }) => ({
        id: input.id,
        range: input.range,
        rect: { x, y, width, height: 30 }
      }),
      decorateBox: (_input, box) => box
    });

    expect(result.children[0]?.rect.height).toBe(30);
    expect(get).not.toHaveBeenCalled();
    expect(setContainer).not.toHaveBeenCalled();
  });

  it("delegates the current specialized input from the retained uncached entry", () => {
    const layoutSpecialized = vi.fn(({ input, x, y, width }) => ({
      id: input.id,
      range: input.range,
      rect: { x, y, width, height: 24 }
    }));
    const result = layoutQuireBlockFlowInputUncached({
      input: { id: "provider", range: { from: 3, to: 7 } },
      x: 12,
      y: 18,
      width: 160,
      blockHeight: 10,
      blockGap: 0,
      resolveChildren: () => undefined,
      isSpecialized: () => true,
      layoutSpecialized,
      decorateBox: (_input, box) => box
    });

    expect(result.rect).toEqual({ x: 12, y: 18, width: 160, height: 24 });
    expect(layoutSpecialized).toHaveBeenCalledOnce();
  });
});
