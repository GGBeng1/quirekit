import { describe, expect, it } from "vitest";
import {
  createIdentitySurfaceBounds,
  createViewCoordinateAuthority,
  resolveViewCoordinateAuthority
} from "./coordinate-authority";
import {
  mapQuireViewViewportSizeToCanvasPhysical
} from "../view-graph/coordinate-space";

describe("view coordinate authority", () => {
  it("adds the surface client origin exactly once when mapping document to client", () => {
    const authority = createViewCoordinateAuthority({
      surfaceClientRect: { left: 137, top: 89, width: 600, height: 800 },
      surfaceBounds: { x: 0, y: 0, width: 600, height: 800 }
    });

    // A glyph painted at document x=88, y=104 must land at the surface origin plus
    // the document coordinate — never the origin plus a doubled coordinate.
    expect(authority.clientPointFromDocument({ x: 88, y: 104 })).toEqual({
      left: 137 + 88,
      top: 89 + 104
    });
    expect(authority.clientRectFromDocument({ x: 88, y: 104, width: 1, height: 24 })).toEqual({
      left: 225,
      right: 226,
      top: 193,
      bottom: 217
    });
  });

  it("inverts exactly so posAtCoords(coordsAtPos(p)) round-trips", () => {
    const authority = createViewCoordinateAuthority({
      surfaceClientRect: { left: 137, top: 89, width: 600, height: 800 },
      surfaceBounds: { x: 0, y: 0, width: 600, height: 800 }
    });

    for (const point of [
      { x: 0, y: 0 },
      { x: 88, y: 104 },
      { x: 312.5, y: 1980.25 }
    ]) {
      const client = authority.clientPointFromDocument(point);
      expect(authority.documentPointFromClient(client)).toEqual(point);
    }
  });

  it("honors a non-zero document origin and a non-unit scale", () => {
    // A surface whose client box is twice the document bounds and whose bounds are
    // anchored away from the origin: the affine must apply both origin and scale.
    const authority = createViewCoordinateAuthority({
      surfaceClientRect: { left: 10, top: 20, width: 200, height: 400 },
      surfaceBounds: { x: 50, y: 60, width: 100, height: 200 }
    });

    expect(authority.clientPointFromDocument({ x: 60, y: 80 })).toEqual({
      left: 10 + (60 - 50) * 2,
      top: 20 + (80 - 60) * 2
    });
    expect(
      authority.documentPointFromClient(authority.clientPointFromDocument({ x: 123, y: 321 }))
    ).toEqual({ x: 123, y: 321 });
  });

  it("exposes explicit coordinate paths for client and document conversions", () => {
    const authority = createViewCoordinateAuthority({
      surfaceClientRect: { left: 10, top: 20, width: 200, height: 400 },
      surfaceBounds: { x: 50, y: 60, width: 100, height: 200 }
    });

    expect(authority.clientToDocumentPoint({ left: 30, top: 60 })).toEqual({
      from: { space: "client", x: 30, y: 60 },
      to: { space: "document", x: 60, y: 80 },
      path: {
        spaces: ["client", "document"],
        steps: [
          {
            from: "client",
            to: "document",
            input: { space: "client", x: 30, y: 60 },
            output: { space: "document", x: 60, y: 80 },
            scaleX: 2,
            scaleY: 2
          }
        ]
      }
    });
    expect(authority.documentToClientRect({ x: 60, y: 80, width: 4, height: 8 }))
      .toEqual({
        from: { space: "document", x: 60, y: 80, width: 4, height: 8 },
        to: { space: "client", x: 30, y: 60, width: 8, height: 16 },
        path: expect.objectContaining({
          spaces: ["document", "client"]
        })
      });
  });

  it("maps viewport CSS pixels to canvas physical pixels through a tagged path", () => {
    expect(
      mapQuireViewViewportSizeToCanvasPhysical(
        { space: "viewport", width: 320, height: 180 },
        2
      )
    ).toEqual({ space: "canvas-physical", width: 640, height: 360 });
  });

  it("falls back to an identity projection when no surface bounds are known", () => {
    const surfaceClientRect = { left: 200, top: 100, width: 320, height: 180 };

    expect(createIdentitySurfaceBounds(surfaceClientRect)).toEqual({
      x: 0,
      y: 0,
      width: 320,
      height: 180
    });

    const authority = resolveViewCoordinateAuthority(surfaceClientRect, undefined);

    expect(authority.clientPointFromDocument({ x: 40, y: 24 })).toEqual({
      left: 240,
      top: 124
    });
    expect(authority.documentPointFromClient({ left: 240, top: 124 })).toEqual({
      x: 40,
      y: 24
    });
  });

  it("keeps a stable scale when surface or document bounds collapse", () => {
    const authority = createViewCoordinateAuthority({
      surfaceClientRect: { left: 5, top: 5, width: 0, height: 0 },
      surfaceBounds: { x: 0, y: 0, width: 0, height: 0 }
    });

    expect(authority.clientPointFromDocument({ x: 12, y: 8 })).toEqual({
      left: 17,
      top: 13
    });
  });
});
