import type { QuireLayoutPage } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import { resolveMountedBodyPageEdgeProjection } from "./projection";

describe("mounted body page-edge projection", () => {
  const pages: readonly QuireLayoutPage[] = [
    {
      pageIndex: 0,
      range: { from: 1, to: 20 },
      pageRect: { x: 0, y: 0, width: 200, height: 180 },
      bodyRect: { x: 20, y: 30, width: 160, height: 100 }
    },
    {
      pageIndex: 1,
      range: { from: 20, to: 40 },
      pageRect: { x: 0, y: 200, width: 200, height: 180 },
      bodyRect: { x: 20, y: 230, width: 160, height: 100 }
    }
  ];

  it("keeps points already inside a page body unchanged", () => {
    expect(resolveMountedBodyPageEdgeProjection({
      pages,
      point: { x: 80, y: 70 }
    })).toBeNull();
  });

  it("projects same-page header and footer points just inside the body", () => {
    expect(resolveMountedBodyPageEdgeProjection({
      pages,
      point: { x: 80, y: 10 }
    })).toEqual({ x: 80, y: 30.5 });
    expect(resolveMountedBodyPageEdgeProjection({
      pages,
      point: { x: 80, y: 160 }
    })).toEqual({ x: 80, y: 129.5 });
  });

  it("uses the nearest adjacent body edge inside an inter-page gap", () => {
    expect(resolveMountedBodyPageEdgeProjection({
      pages,
      point: { x: 80, y: 185 }
    })).toEqual({ x: 80, y: 129.5 });
    expect(resolveMountedBodyPageEdgeProjection({
      pages,
      point: { x: 80, y: 215 }
    })).toEqual({ x: 80, y: 230.5 });
  });

  it("clamps horizontal page chrome into the selected body frame", () => {
    expect(resolveMountedBodyPageEdgeProjection({
      pages,
      point: { x: 260, y: 160 }
    })).toEqual({ x: 179.5, y: 129.5 });
  });
});
