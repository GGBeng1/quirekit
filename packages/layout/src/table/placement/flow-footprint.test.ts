import { describe, expect, it } from "vitest";
import type { QuireTableFloatingPlacement } from "../types";
import { resolveQuireTableFloatingFlowFootprint } from "./flow-footprint";

const textPlacement: QuireTableFloatingPlacement = {
  horizontal: {
    reference: "page",
    offset: 0,
    alignment: null
  },
  vertical: {
    reference: "text",
    offset: 12,
    alignment: null
  },
  clearances: {
    top: 0,
    right: 2,
    bottom: 6,
    left: 2
  },
  wrapMode: null,
  allowOverlap: false
};

describe("resolveQuireTableFloatingFlowFootprint", () => {
  it("reserves the complete visual bottom for a text-anchored full-width obstruction", () => {
    expect(resolveQuireTableFloatingFlowFootprint({
      placement: textPlacement,
      tableWidth: 96,
      tableHeight: 80,
      containingInlineSize: 100
    })).toEqual({ kind: "block", height: 98 });
  });

  it("keeps a narrower floating table outside sequential block flow", () => {
    expect(resolveQuireTableFloatingFlowFootprint({
      placement: textPlacement,
      tableWidth: 70,
      tableHeight: 80,
      containingInlineSize: 100
    })).toEqual({ kind: "none", height: 0 });
  });

  it("does not synthesize sequential flow for a page-relative vertical anchor", () => {
    expect(resolveQuireTableFloatingFlowFootprint({
      placement: {
        ...textPlacement,
        vertical: {
          reference: "page",
          offset: 12,
          alignment: null
        }
      },
      tableWidth: 100,
      tableHeight: 80,
      containingInlineSize: 100
    })).toEqual({ kind: "none", height: 0 });
  });

  it("clamps a negative text offset to the remaining visual bottom", () => {
    expect(resolveQuireTableFloatingFlowFootprint({
      placement: {
        ...textPlacement,
        vertical: {
          reference: "text",
          offset: -12,
          alignment: null
        },
        clearances: {
          ...textPlacement.clearances,
          bottom: 3
        }
      },
      tableWidth: 100,
      tableHeight: 20,
      containingInlineSize: 100
    })).toEqual({ kind: "block", height: 11 });
  });
});
