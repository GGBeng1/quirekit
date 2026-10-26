import {
  filterQuireDisplayListToRect,
  type QuireDisplayCommand,
  type QuireDisplayList
} from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import {
  createQuirePageStackDisplayListPaintSignature,
  createQuirePageStackDisplayListPaintSignaturesForRects,
  createQuirePageStackDisplayListPaintSignatureForRect,
  QuirePageStackDisplayCommandPaintSignatureCache
} from "./signature";

describe("page-stack paint signatures", () => {
  it("invalidates page paint when image colors change without replacing its source", () => {
    const signature = (slope: number): string => createQuirePageStackDisplayListPaintSignature({
      bounds: { x: 0, y: 0, width: 200, height: 200 },
      commands: [{ id: "picture", kind: "image", rect: { x: 0, y: 0, width: 100, height: 100 },
        href: "image.png", colorAdjustment: { slope, intercept: 0.7 } }]
    }, () => "same-image");
    expect(signature(0.3)).not.toBe(signature(1));
  });
  it("matches filter-then-signature output for one page rect", () => {
    const pageRect = { x: 0, y: 80, width: 120, height: 80 };
    const displayList = {
      bounds: { x: 0, y: 0, width: 120, height: 180 },
      commands: [
        {
          id: "outside",
          kind: "text",
          rect: { x: 8, y: 8, width: 40, height: 18 },
          text: "outside",
          origin: { x: 8, y: 22 },
          font: "16px sans-serif",
          fillStyle: "#111827"
        },
        {
          id: "inside",
          kind: "text",
          rect: { x: 8, y: 96, width: 32, height: 18 },
          text: "inside",
          origin: { x: 8, y: 110 },
          font: "16px sans-serif",
          fillStyle: "#111827"
        },
        {
          id: "clip",
          kind: "clip",
          rect: { x: 0, y: 80, width: 120, height: 80 },
          commands: [
            {
              id: "clip-outside",
              kind: "fill-rect",
              rect: { x: 0, y: 160, width: 120, height: 8 },
              fillStyle: "#fee2e2"
            },
            {
              id: "clip-inside",
              kind: "fill-rect",
              rect: { x: 0, y: 90, width: 120, height: 8 },
              fillStyle: "#dcfce7"
            }
          ]
        }
      ]
    } satisfies QuireDisplayList;
    const objectSignature = (): string => "none";
    const filteredSignature = createQuirePageStackDisplayListPaintSignature(
      filterQuireDisplayListToRect(displayList, pageRect),
      objectSignature
    );

    expect(
      createQuirePageStackDisplayListPaintSignatureForRect(
        displayList,
        pageRect,
        objectSignature
      )
    ).toBe(filteredSignature);
  });

  it("matches per-rect signatures when batching page rects", () => {
    const pageRects = [
      { x: 0, y: 0, width: 120, height: 80 },
      { x: 0, y: 80, width: 120, height: 80 },
      { x: 0, y: 160, width: 120, height: 80 }
    ];
    const displayList = {
      bounds: { x: 0, y: 0, width: 120, height: 240 },
      commands: [
        {
          id: "first",
          kind: "text",
          rect: { x: 8, y: 8, width: 40, height: 18 },
          text: "first",
          origin: { x: 8, y: 22 },
          font: "16px sans-serif",
          fillStyle: "#111827"
        },
        {
          id: "line",
          kind: "line",
          from: { x: 0, y: 80 },
          to: { x: 120, y: 80 },
          strokeStyle: "#e5e7eb",
          lineWidth: 2
        },
        {
          id: "clip",
          kind: "clip",
          rect: { x: 0, y: 70, width: 120, height: 110 },
          commands: [
            {
              id: "second",
              kind: "text",
              rect: { x: 8, y: 96, width: 48, height: 18 },
              text: "second",
              origin: { x: 8, y: 110 },
              font: "16px sans-serif",
              fillStyle: "#111827"
            },
            {
              id: "third",
              kind: "text",
              rect: { x: 8, y: 170, width: 40, height: 18 },
              text: "third",
              origin: { x: 8, y: 184 },
              font: "16px sans-serif",
              fillStyle: "#111827"
            }
          ]
        }
      ]
    } satisfies QuireDisplayList;
    const objectSignature = (): string => "none";

    expect(createQuirePageStackDisplayListPaintSignaturesForRects(
      displayList,
      pageRects,
      objectSignature
    )).toEqual(pageRects.map((pageRect) =>
      createQuirePageStackDisplayListPaintSignatureForRect(
        displayList,
        pageRect,
        objectSignature
      )
    ));
  });

  it("signs glyph-run placement arrays by object identity", () => {
    const glyphs = [
      {
        glyphId: 1,
        sourceCluster: 0,
        x: 0,
        y: 0,
        xAdvance: 8,
        yAdvance: 0,
        xOffset: 0,
        yOffset: 0
      }
    ];
    const seenObjects: object[] = [];
    const displayList = {
      bounds: { x: 0, y: 0, width: 120, height: 80 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 40, height: 18 },
          text: "A",
          origin: { x: 8, y: 22 },
          font: "16px sans-serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs
        }
      ]
    } satisfies QuireDisplayList;
    const signature = createQuirePageStackDisplayListPaintSignature(
      displayList,
      (value) => {
        if (value !== undefined) {
          seenObjects.push(value);
        }
        return "glyphs:1";
      }
    );

    expect(seenObjects).toEqual([glyphs]);
    expect(signature).toContain("glyphs:1");
    expect(signature).not.toContain("glyphId");
  });

  it("invalidates page paint when transient command opacity changes", () => {
    const createDisplayList = (opacity?: number): QuireDisplayList => ({
      bounds: { x: 0, y: 0, width: 120, height: 80 },
      commands: [
        {
          id: "header-text",
          kind: "text",
          ...(opacity === undefined ? {} : { opacity }),
          rect: { x: 8, y: 8, width: 80, height: 18 },
          text: "Header",
          origin: { x: 8, y: 22 },
          font: "16px sans-serif",
          fillStyle: "#111827"
        }
      ]
    });
    const objectSignature = (): string => "none";
    const inactiveSignature = createQuirePageStackDisplayListPaintSignature(
      createDisplayList(0.55),
      objectSignature
    );
    const activeSignature = createQuirePageStackDisplayListPaintSignature(
      createDisplayList(),
      objectSignature
    );
    const explicitOpaqueSignature = createQuirePageStackDisplayListPaintSignature(
      createDisplayList(1),
      objectSignature
    );

    expect(inactiveSignature).not.toBe(activeSignature);
    expect(explicitOpaqueSignature).toBe(activeSignature);
  });

  it("invalidates page paint when only an image transform changes", () => {
    const createDisplayList = (rotation: number): QuireDisplayList => ({
      bounds: { x: 0, y: 0, width: 120, height: 80 },
      commands: [{
        id: "picture",
        kind: "image",
        rect: { x: 20, y: 20, width: 60, height: 30 },
        href: "blob:picture",
        transform: {
          rotation,
          flipHorizontal: false,
          flipVertical: false
        }
      }]
    });
    const objectSignature = (): string => "none";

    expect(createQuirePageStackDisplayListPaintSignature(
      createDisplayList(0),
      objectSignature
    )).not.toBe(createQuirePageStackDisplayListPaintSignature(
      createDisplayList(45),
      objectSignature
    ));
  });

  it("invalidates page paint when only a clip transform changes", () => {
    const createDisplayList = (rotation: number): QuireDisplayList => {
      const transform = rotation === 0
        ? undefined
        : {
            a: 0,
            b: 1,
            c: -1,
            d: 0,
            e: 80,
            f: 0
          };
      return {
        bounds: { x: 0, y: 0, width: 120, height: 80 },
        commands: [{
          id: "watermark",
          kind: "clip",
          rect: { x: 20, y: 20, width: 60, height: 20 },
          ...(transform === undefined ? {} : { transform }),
          commands: [{
            id: "watermark-text",
            kind: "text",
            rect: { x: 20, y: 20, width: 60, height: 20 },
            text: "机密",
            origin: { x: 20, y: 36 },
            font: "16px sans-serif",
            fillStyle: "#c8c8c8"
          }]
        }]
      };
    };
    const objectSignature = (): string => "none";

    expect(createQuirePageStackDisplayListPaintSignature(
      createDisplayList(0),
      objectSignature
    )).not.toBe(createQuirePageStackDisplayListPaintSignature(
      createDisplayList(90),
      objectSignature
    ));
  });

  it("invalidates page paint when only a path dash changes", () => {
    const createDisplayList = (lineDash?: readonly number[]): QuireDisplayList => ({
      bounds: { x: 0, y: 0, width: 120, height: 80 },
      commands: [{
        id: "drawing-outline",
        kind: "path",
        rect: { x: 8, y: 8, width: 80, height: 40 },
        segments: [
          { kind: "move-to", point: { x: 8, y: 8 } },
          { kind: "line-to", point: { x: 88, y: 8 } }
        ],
        strokeStyle: "#dc2626",
        lineWidth: 4,
        ...(lineDash === undefined ? {} : { lineDash })
      }]
    });
    const objectSignature = (): string => "none";

    expect(createQuirePageStackDisplayListPaintSignature(
      createDisplayList(),
      objectSignature
    )).not.toBe(createQuirePageStackDisplayListPaintSignature(
      createDisplayList([16, 8, 4, 8]),
      objectSignature
    ));
  });

  it("reuses command paint signatures by display command identity", () => {
    const glyphs = [
      {
        glyphId: 1,
        sourceCluster: 0,
        x: 0,
        y: 0,
        xAdvance: 8,
        yAdvance: 0,
        xOffset: 0,
        yOffset: 0
      }
    ];
    const displayList = {
      bounds: { x: 0, y: 0, width: 120, height: 80 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 40, height: 18 },
          text: "A",
          origin: { x: 8, y: 22 },
          font: "16px sans-serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs
        }
      ]
    } satisfies QuireDisplayList;
    const cache = new QuirePageStackDisplayCommandPaintSignatureCache();
    let objectSignatureCalls = 0;

    const firstSignature = createQuirePageStackDisplayListPaintSignatureForRect(
      displayList,
      displayList.bounds,
      () => {
        objectSignatureCalls += 1;
        return "glyphs:1";
      },
      cache
    );
    const secondSignature = createQuirePageStackDisplayListPaintSignatureForRect(
      displayList,
      displayList.bounds,
      () => {
        objectSignatureCalls += 1;
        return "glyphs:1";
      },
      cache
    );

    expect(secondSignature).toBe(firstSignature);
    expect(objectSignatureCalls).toBe(1);
  });

  it("serializes a multi-page command once while batching signatures", () => {
    const glyphs = [
      {
        glyphId: 1,
        sourceCluster: 0,
        x: 0,
        y: 0,
        xAdvance: 8,
        yAdvance: 0,
        xOffset: 0,
        yOffset: 0
      }
    ];
    const displayList = {
      bounds: { x: 0, y: 0, width: 120, height: 160 },
      commands: [
        {
          id: "cross-page-glyph",
          kind: "glyph-run",
          rect: { x: 8, y: 72, width: 40, height: 24 },
          text: "A",
          origin: { x: 8, y: 88 },
          font: "16px sans-serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs
        }
      ]
    } satisfies QuireDisplayList;
    const cache = new QuirePageStackDisplayCommandPaintSignatureCache();
    let objectSignatureCalls = 0;

    const signatures = createQuirePageStackDisplayListPaintSignaturesForRects(
      displayList,
      [
        { x: 0, y: 0, width: 120, height: 80 },
        { x: 0, y: 80, width: 120, height: 80 }
      ],
      () => {
        objectSignatureCalls += 1;
        return "glyphs:1";
      },
      cache
    );

    expect(signatures[0]).toBe(signatures[1]);
    expect(objectSignatureCalls).toBe(1);
  });

  it("includes commands with unknown bounds in every candidate page signature", () => {
    const command = {
      id: "invalid-runtime-rect",
      kind: "fill-rect",
      rect: { x: Number.NaN, y: 0, width: 20, height: 20 },
      fillStyle: "#000"
    } satisfies QuireDisplayCommand;
    const displayList = {
      bounds: { x: 0, y: 0, width: 120, height: 160 },
      commands: [command]
    } satisfies QuireDisplayList;
    const objectSignature = (): string => "none";
    const expected = createQuirePageStackDisplayListPaintSignature(
      displayList,
      objectSignature
    );

    expect(createQuirePageStackDisplayListPaintSignaturesForRects(
      displayList,
      [
        { x: 0, y: 0, width: 120, height: 80 },
        { x: 0, y: 80, width: 120, height: 80 }
      ],
      objectSignature
    )).toEqual([expected, expected]);
  });
});
