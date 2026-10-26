import { describe, expect, it } from "vitest";
import { projectMountedDragClientPointToSurface } from "./projection";

describe("mounted pointer input", () => {
  it("projects active drag points to layout edges horizontally and visible bounds vertically", () => {
    const point = projectMountedDragClientPointToSurface({
      clientPoint: { clientX: 1200, clientY: 900 },
      surfaceClientRect: {
        left: 100,
        top: -400,
        width: 800,
        height: 2400
      },
      dragBoundaryClientRect: {
        left: 150,
        top: 80,
        width: 500,
        height: 300
      },
      layoutViewportClientRect: {
        left: 220,
        top: 20,
        width: 520,
        height: 1200
      }
    });

    expect(point).toEqual({ clientX: 739, clientY: 379 });
  });

  it("projects active drag points to the layout left edge outside the scroller", () => {
    const point = projectMountedDragClientPointToSurface({
      clientPoint: { clientX: -200, clientY: 90 },
      surfaceClientRect: {
        left: 100,
        top: -400,
        width: 800,
        height: 2400
      },
      dragBoundaryClientRect: {
        left: 150,
        top: 80,
        width: 500,
        height: 300
      },
      layoutViewportClientRect: {
        left: 220,
        top: 20,
        width: 520,
        height: 1200
      }
    });

    expect(point).toEqual({ clientX: 221, clientY: 90 });
  });

  it("falls back to the coordinate surface when no visible boundary is provided", () => {
    const point = projectMountedDragClientPointToSurface({
      clientPoint: { clientX: 1200, clientY: 900 },
      surfaceClientRect: {
        left: 100,
        top: -400,
        width: 800,
        height: 2400
      }
    });

    expect(point).toEqual({ clientX: 899, clientY: 900 });
  });

  it("keeps subpixel and clipped top edges inside the hit surface", () => {
    expect(projectMountedDragClientPointToSurface({
      clientPoint: { clientX: -20, clientY: -20 },
      surfaceClientRect: { left: 10, top: -40, width: 0.5, height: 200 },
      dragBoundaryClientRect: { left: 0, top: 30, width: 100, height: 60 }
    })).toEqual({ clientX: 10.25, clientY: 31 });
  });
});
