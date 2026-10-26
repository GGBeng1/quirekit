import { describe, expect, it } from "vitest";
import {
  createCanvasClusterGlyphRunPainter,
  createCanvasPathGlyphRunPainter,
  renderCanvasDisplayList,
  type QuireDisplayList,
  type QuireGlyphRunCoverage,
  type CanvasGlyphRunFallbackDiagnostic,
  type QuireGlyphRunGlyphPlacement,
  type CanvasGlyphPathOutline,
  type CanvasGlyphPathRequest,
  type CanvasGlyphPathSource,
  type CanvasGlyphRunPainter,
  serializeSvgDisplayListToSvg
} from "../index";

describe("native canvas 2d renderer adapter", () => {
  it("clears bounds and paints display commands in order", () => {
    const target = new SpyCanvas2DTarget();
    const displayList: QuireDisplayList = {
      bounds: { x: 10, y: 20, width: 300, height: 56 },
      commands: [
        {
          id: "document-background",
          kind: "fill-rect",
          rect: { x: 10, y: 20, width: 300, height: 56 },
          fillStyle: "#ffffff"
        },
        {
          id: "selection-range-0",
          kind: "fill-rect",
          range: { from: 5, to: 7 },
          rect: { x: 10, y: 52, width: 300, height: 24 },
          fillStyle: "#bfdbfe"
        },
        {
          id: "paragraph-0:text",
          kind: "text",
          range: { from: 0, to: 5 },
          rect: { x: 10, y: 20, width: 300, height: 28 },
          text: "One",
          origin: { x: 10, y: 36 },
          font: "14px serif",
          fillStyle: "#020617"
        },
        {
          id: "caret-0",
          kind: "caret",
          range: { from: 2, to: 2 },
          rect: { x: 130, y: 20, width: 1, height: 24 },
          fillStyle: "#111827"
        }
      ]
    };

    renderCanvasDisplayList({ displayList, target });

    expect(target.calls).toEqual([
      "clearRect(10,20,300,56)",
      "fillStyle=#ffffff",
      "fillRect(10,20,300,56)",
      "fillStyle=#bfdbfe",
      "fillRect(10,52,300,24)",
      "font=14px serif",
      "fillStyle=#020617",
      "fillText(One,10,36)",
      "fillStyle=#111827",
      "fillRect(130,20,1,24)"
    ]);
  });

  it("paints glyph-run commands through native text fallback", () => {
    const target = new SpyCanvas2DTarget();
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 120, height: 40 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 50, height: 24 },
          text: "AB",
          origin: { x: 8, y: 28 },
          font: "16px serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs: [
            {
              glyphId: 36,
              sourceCluster: 0,
              x: 0,
              y: 0,
              xAdvance: 12,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0,
              fontId: "serif-regular",
              fontFamily: "Fixture Serif"
            }
          ]
        }
      ]
    };

    renderCanvasDisplayList({ displayList, target });

    expect(target.calls).toEqual([
      "clearRect(0,0,120,40)",
      "font=16px serif",
      "fillStyle=#111827",
      "fillText(AB,8,28)"
    ]);
  });

  it("lets a glyph-run painter take over shaped glyph drawing", () => {
    const target = new SpyCanvas2DTarget();
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 120, height: 40 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 50, height: 24 },
          text: "AB",
          origin: { x: 8, y: 28 },
          font: "16px serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs: [
            {
              glyphId: 36,
              sourceCluster: 0,
              x: 0,
              y: 0,
              xAdvance: 12,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            }
          ]
        }
      ]
    };

    renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: new SpyGlyphRunPainter(target)
    });

    expect(target.calls).toEqual([
      "clearRect(0,0,120,40)",
      "paintGlyphRun(AB,1)"
    ]);
  });

  it("can paint glyph-run source clusters at shaped offsets", () => {
    const target = new SpyCanvas2DTarget();
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 140, height: 48 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 80, height: 28 },
          text: "ABC",
          origin: { x: 8, y: 30 },
          font: "16px serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs: [
            {
              glyphId: 36,
              sourceCluster: 0,
              x: 0,
              y: 0,
              xAdvance: 12,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            },
            {
              glyphId: 37,
              sourceCluster: 1,
              x: 12,
              y: 0,
              xAdvance: 13,
              yAdvance: 0,
              xOffset: 1,
              yOffset: 0
            },
            {
              glyphId: 38,
              sourceCluster: 2,
              x: 25,
              y: 0,
              xAdvance: 11,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            }
          ]
        }
      ]
    };

    renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: createCanvasClusterGlyphRunPainter()
    });

    expect(target.calls).toEqual([
      "clearRect(0,0,140,48)",
      "font=16px serif",
      "fillStyle=#111827",
      "fillText(A,8,30)",
      "fillText(B,21,30)",
      "fillText(C,33,30)"
    ]);
  });

  it("fails closed when a cluster glyph painter cannot stroke outlined text", () => {
    const target = new TextOnlyCanvas2DTarget();
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 80, height: 40 },
      commands: [
        {
          id: "outlined-glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 32, height: 24 },
          text: "AB",
          origin: { x: 8, y: 28 },
          font: "16px serif",
          fillStyle: "#111827",
          paintMode: "stroke",
          glyphCoverage: "complete",
          glyphs: [
            {
              glyphId: 36,
              sourceCluster: 0,
              x: 0,
              y: 0,
              xAdvance: 12,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            },
            {
              glyphId: 37,
              sourceCluster: 1,
              x: 12,
              y: 0,
              xAdvance: 12,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            }
          ]
        }
      ]
    };

    expect(() => renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: createCanvasClusterGlyphRunPainter()
    })).toThrow("Canvas target must support strokeText");
    expect(target.calls).not.toContain("fillText(AB,8,28)");
  });

  it("falls back to native text when shaped glyphs do not cover the whole run", () => {
    const target = new SpyCanvas2DTarget();
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 140, height: 48 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 80, height: 28 },
          text: "ABC",
          origin: { x: 8, y: 30 },
          font: "16px serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs: [
            // No glyph for "A" (sourceCluster 0): the painter must fall back to
            // native text for the whole run instead of dropping the uncovered "A".
            {
              glyphId: 37,
              sourceCluster: 1,
              x: 12,
              y: 0,
              xAdvance: 13,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            },
            {
              glyphId: 38,
              sourceCluster: 2,
              x: 25,
              y: 0,
              xAdvance: 11,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            }
          ]
        }
      ]
    };

    renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: createCanvasClusterGlyphRunPainter()
    });

    expect(target.calls).toContain("fillText(ABC,8,30)");
    expect(target.calls).not.toContain("fillText(B,21,30)");
  });

  it("declines complex-script runs so native text renders connected forms", () => {
    const target = new SpyCanvas2DTarget();
    const arabic = "مرحبا"; // مرحبا
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 140, height: 48 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 80, height: 28 },
          text: arabic,
          origin: { x: 8, y: 30 },
          font: "16px serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs: Array.from({ length: 5 }, (_unused, index) => ({
            glyphId: index + 1,
            sourceCluster: index,
            x: index * 10,
            y: 0,
            xAdvance: 10,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0
          }))
        }
      ]
    };

    renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: createCanvasClusterGlyphRunPainter()
    });

    // Per-cluster fillText renders isolated (disconnected) Arabic forms; the painter
    // must decline so the whole run goes through native text, which joins it.
    expect(target.calls).toContain(`fillText(${arabic},8,30)`);
    expect(target.calls).not.toContain(`fillText(م,8,30)`);
  });

  it("renders the same run text as the SVG backend across scripts (canvas never drops)", () => {
    const samples = ["Hello", "你好世界", "双击Canvas", "مرحبا", "שלום"];

    for (const text of samples) {
      const codepoints = Array.from(text);
      const displayList: QuireDisplayList = {
        bounds: { x: 0, y: 0, width: 400, height: 48 },
        commands: [
          {
            id: "glyph-run",
            kind: "glyph-run",
            rect: { x: 8, y: 8, width: 300, height: 28 },
            text,
            origin: { x: 8, y: 30 },
            font: "16px serif",
            fillStyle: "#111827",
            glyphCoverage: "complete",
            glyphs: codepoints.map((_codepoint, index) => ({
              glyphId: index + 1,
              sourceCluster: index,
              x: index * 10,
              y: 0,
              xAdvance: 10,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            }))
          }
        ]
      };

      const target = new SpyCanvas2DTarget();
      renderCanvasDisplayList({
        displayList,
        target,
        glyphRunPainter: createCanvasClusterGlyphRunPainter()
      });

      // Concatenate the text the canvas actually drew (cluster slices in order, or a
      // native-text fallback for complex scripts) and compare against the SVG output,
      // which always emits the whole run text. Neither backend may drop any text.
      const canvasText = target.calls
        .map((call) => /^fillText\((.*),-?[\d.]+,-?[\d.]+\)$/u.exec(call)?.[1])
        .filter((slice): slice is string => slice !== undefined)
        .join("");
      const svg = serializeSvgDisplayListToSvg({ displayList });

      expect(canvasText).toBe(text);
      expect(svg).toContain(text);
    }
  });

  it("paints multiple glyphs from one source cluster as one text slice", () => {
    const target = new SpyCanvas2DTarget();
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 140, height: 48 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 80, height: 28 },
          text: "ffix",
          origin: { x: 8, y: 30 },
          font: "16px serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs: [
            {
              glyphId: 5044,
              sourceCluster: 0,
              x: 0,
              y: 0,
              xAdvance: 18,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            },
            {
              glyphId: 91,
              sourceCluster: 3,
              x: 18,
              y: 0,
              xAdvance: 10,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            }
          ]
        }
      ]
    };

    renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: createCanvasClusterGlyphRunPainter()
    });

    expect(target.calls).toEqual([
      "clearRect(0,0,140,48)",
      "font=16px serif",
      "fillStyle=#111827",
      "fillText(ffi,8,30)",
      "fillText(x,26,30)"
    ]);
  });

  it("paints glyph-run commands with renderer path outlines", () => {
    const target = new SpyCanvas2DTarget();
    const source = new FakeGlyphPathSource([
      [
        "fixture-regular:65:Fixture Serif",
        {
          segments: [
            { kind: "move-to", point: { x: 0, y: 0 } },
            { kind: "line-to", point: { x: 4, y: 0 } },
            { kind: "line-to", point: { x: 4, y: 6 } },
            { kind: "close-path" }
          ]
        }
      ],
      [
        "fixture-bold:66:Fixture Sans",
        {
          segments: [
            { kind: "move-to", point: { x: 1, y: 1 } },
            {
              kind: "quadratic-curve-to",
              control: { x: 2, y: 3 },
              point: { x: 4, y: 5 }
            },
            {
              kind: "bezier-curve-to",
              control1: { x: 5, y: 6 },
              control2: { x: 7, y: 8 },
              point: { x: 9, y: 10 }
            },
            { kind: "close-path" }
          ]
        }
      ]
    ]);
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 160, height: 64 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 10, y: 10, width: 80, height: 32 },
          text: "AB",
          origin: { x: 10, y: 20 },
          font: "16px serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs: [
            {
              glyphId: 65,
              sourceCluster: 0,
              x: 2,
              y: 3,
              xAdvance: 8,
              yAdvance: 0,
              xOffset: 1,
              yOffset: -1,
              fontId: "fixture-regular",
              fontFamily: "Fixture Serif"
            },
            {
              glyphId: 66,
              sourceCluster: 1,
              x: 10,
              y: -2,
              xAdvance: 9,
              yAdvance: 0,
              xOffset: 0.5,
              yOffset: 1.5,
              fontId: "fixture-bold",
              fontFamily: "Fixture Sans"
            }
          ]
        }
      ]
    };

    renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: createCanvasPathGlyphRunPainter(source)
    });

    expect(target.calls).toEqual([
      "clearRect(0,0,160,64)",
      "fillStyle=#111827",
      "beginPath()",
      "moveTo(13,22)",
      "lineTo(17,22)",
      "lineTo(17,28)",
      "closePath()",
      "moveTo(21.5,20.5)",
      "quadraticCurveTo(22.5,22.5,24.5,24.5)",
      "bezierCurveTo(25.5,25.5,27.5,27.5,29.5,29.5)",
      "closePath()",
      "fill()"
    ]);
    expect(source.requests).toEqual([
      {
        glyphId: 65,
        font: "16px serif",
        fontId: "fixture-regular",
        fontFamily: "Fixture Serif"
      },
      {
        glyphId: 66,
        font: "16px serif",
        fontId: "fixture-bold",
        fontFamily: "Fixture Sans"
      }
    ]);
  });

  it("falls back to native text when glyph path APIs are missing", () => {
    const target = new TextOnlyCanvas2DTarget();
    const source = new FakeGlyphPathSource([
      [
        "fixture-regular:65:Fixture Serif",
        {
          segments: [
            { kind: "move-to", point: { x: 0, y: 0 } },
            { kind: "line-to", point: { x: 4, y: 0 } },
            { kind: "close-path" }
          ]
        }
      ]
    ]);
    const displayList = createSingleGlyphPathDisplayList();

    renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: createCanvasPathGlyphRunPainter(source)
    });

    expect(target.calls).toEqual([
      "clearRect(0,0,120,40)",
      "font=16px serif",
      "fillStyle=#111827",
      "fillText(A,8,28)"
    ]);
  });

  it("falls back to native text when glyph coverage is partial", () => {
    const target = new SpyCanvas2DTarget();
    const source = new FakeGlyphPathSource([
      [
        "fixture-regular:65:Fixture Serif",
        {
          segments: [
            { kind: "move-to", point: { x: 0, y: 0 } },
            { kind: "line-to", point: { x: 4, y: 0 } },
            { kind: "close-path" }
          ]
        }
      ]
    ]);
    const displayList = createSingleGlyphPathDisplayList("partial");

    renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: createCanvasPathGlyphRunPainter(source)
    });

    expect(target.calls).toEqual([
      "clearRect(0,0,120,40)",
      "font=16px serif",
      "fillStyle=#111827",
      "fillText(A,8,28)"
    ]);
    expect(source.requests).toEqual([]);
  });

  it("falls back to native text when a glyph outline is missing", () => {
    const target = new SpyCanvas2DTarget();
    const source = new FakeGlyphPathSource([]);
    const displayList = createSingleGlyphPathDisplayList();
    const diagnostics: CanvasGlyphRunFallbackDiagnostic[] = [];

    renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: createCanvasPathGlyphRunPainter(source),
      onGlyphRunFallback: (diagnostic) => diagnostics.push(diagnostic)
    });

    expect(target.calls).toEqual([
      "clearRect(0,0,120,40)",
      "font=16px serif",
      "fillStyle=#111827",
      "fillText(A,8,28)"
    ]);
    expect(diagnostics).toEqual([
      {
        commandId: "glyph-run",
        font: "16px serif",
        fontFamily: "Fixture Serif",
        fontId: "fixture-regular",
        glyphId: 65,
        reason: "glyph-path-outline-missing",
        route: "glyph-path",
        text: "A"
      }
    ]);
  });

  it("reports missing font identity before asking the glyph path source", () => {
    const target = new SpyCanvas2DTarget();
    const source = new FakeGlyphPathSource([]);
    const displayList = createSingleGlyphPathDisplayListWithGlyph({
      glyphId: 65,
      sourceCluster: 0,
      x: 0,
      y: 0,
      xAdvance: 12,
      yAdvance: 0,
      xOffset: 0,
      yOffset: 0,
      fontFamily: "Fixture Serif"
    });
    const diagnostics: CanvasGlyphRunFallbackDiagnostic[] = [];

    renderCanvasDisplayList({
      displayList,
      target,
      glyphRunPainter: createCanvasPathGlyphRunPainter(source),
      onGlyphRunFallback: (diagnostic) => diagnostics.push(diagnostic)
    });

    expect(target.calls).toEqual([
      "clearRect(0,0,120,40)",
      "font=16px serif",
      "fillStyle=#111827",
      "fillText(A,8,28)"
    ]);
    expect(source.requests).toEqual([]);
    expect(diagnostics).toEqual([
      {
        commandId: "glyph-run",
        font: "16px serif",
        fontFamily: "Fixture Serif",
        glyphId: 65,
        reason: "glyph-path-font-id-missing",
        route: "glyph-path",
        text: "A"
      }
    ]);
  });

  it("paints line, path, image, and clipped commands through the target surface", () => {
    const target = new SpyCanvas2DTarget();
    const image = { id: "image-source" } as unknown as CanvasImageSource;
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 160, height: 120 },
      commands: [
        {
          id: "line",
          kind: "line",
          from: { x: 8, y: 12 },
          to: { x: 48, y: 12 },
          strokeStyle: "#1f7a8c",
          lineWidth: 2,
          lineDash: [6, 4],
          lineCap: "square"
        },
        {
          id: "path",
          kind: "path",
          rect: { x: 8, y: 20, width: 32, height: 24 },
          segments: [
            { kind: "move-to", point: { x: 8, y: 20 } },
            { kind: "line-to", point: { x: 40, y: 20 } },
            { kind: "line-to", point: { x: 24, y: 44 } },
            { kind: "close-path" }
          ],
          fillStyle: "#eef6ff",
          strokeStyle: "#1f7a8c",
          lineWidth: 1,
          lineDash: [3, 2]
        },
        {
          id: "image",
          kind: "image",
          rect: { x: 56, y: 20, width: 40, height: 30 },
          source: image,
          href: "asset://diagram",
          sourceRect: { x: 12, y: 8, width: 80, height: 60 }
        },
        {
          id: "clip",
          kind: "clip",
          rect: { x: 0, y: 60, width: 80, height: 32 },
          commands: [
            {
              id: "clipped-fill",
              kind: "fill-rect",
              rect: { x: 0, y: 60, width: 120, height: 32 },
              fillStyle: "#fef3c7"
            }
          ]
        }
      ]
    };

    renderCanvasDisplayList({ displayList, target });

    expect(target.calls).toEqual([
      "clearRect(0,0,160,120)",
      "strokeStyle=#1f7a8c",
      "lineWidth=2",
      "setLineDash(6,4)",
      "lineCap=square",
      "beginPath()",
      "moveTo(8,12)",
      "lineTo(48,12)",
      "stroke()",
      "beginPath()",
      "moveTo(8,20)",
      "lineTo(40,20)",
      "lineTo(24,44)",
      "closePath()",
      "fillStyle=#eef6ff",
      "fill()",
      "strokeStyle=#1f7a8c",
      "lineWidth=1",
      "setLineDash(3,2)",
      "lineCap=butt",
      "stroke()",
      "drawImage(image-source,12,8,80,60,56,20,40,30)",
      "save()",
      "beginPath()",
      "rect(0,60,80,32)",
      "clip()",
      "fillStyle=#fef3c7",
      "fillRect(0,60,120,32)",
      "restore()"
    ]);
  });

  it("applies one scoped affine to a transformed clip and its text", () => {
    const target = new SpyCanvas2DTarget();
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 120, height: 120 },
      commands: [{
        id: "rotated-story-clip",
        kind: "clip",
        rect: { x: 20, y: 40, width: 80, height: 24 },
        transform: { a: 0, b: 1, c: -1, d: 0, e: 112, f: -16 },
        visualBounds: { x: 48, y: 8, width: 24, height: 80 },
        commands: [{
          id: "watermark-text",
          kind: "text",
          rect: { x: 32, y: 42, width: 56, height: 20 },
          text: "机密",
          origin: { x: 32, y: 60 },
          font: "20px sans-serif",
          fillStyle: "#c8c8c8"
        }]
      }]
    };

    renderCanvasDisplayList({ displayList, target });

    expect(target.calls).toEqual([
      "clearRect(0,0,120,120)",
      "save()",
      "transform(0,1,-1,0,112,-16)",
      "beginPath()",
      "rect(20,40,80,24)",
      "clip()",
      "font=20px sans-serif",
      "fillStyle=#c8c8c8",
      "fillText(机密,32,60)",
      "restore()"
    ]);
  });

  it("applies one scoped center transform around cropped image paint", () => {
    const target = new SpyCanvas2DTarget();
    const image = { id: "asymmetric-image" } as unknown as CanvasImageSource;
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 80, height: 80 },
      commands: [{
        id: "transformed-image",
        kind: "image",
        rect: { x: 10, y: 20, width: 40, height: 20 },
        source: image,
        sourceRect: { x: 2, y: 4, width: 20, height: 10 },
        transform: {
          rotation: 90,
          flipHorizontal: true,
          flipVertical: false
        }
      }]
    };

    renderCanvasDisplayList({ displayList, target });

    expect(target.calls).toEqual([
      "clearRect(0,0,80,80)",
      "save()",
      "transform(0,-1,-1,0,60,60)",
      "drawImage(asymmetric-image,2,4,20,10,10,20,40,20)",
      "restore()"
    ]);
  });
});

/** Spy implementation of the narrow Canvas 2D renderer target contract. */
class SpyCanvas2DTarget {
  /** Calls observed while rendering. */
  readonly calls: string[] = [];

  private fillStyleValue = "";

  private fontValue = "";

  /**
   * Records fill style assignments.
   *
   * @param value - Fill style assigned by the renderer.
   */
  set fillStyle(value: string) {
    this.fillStyleValue = value;
    this.calls.push(`fillStyle=${value}`);
  }

  /**
   * Returns the most recently assigned fill style.
   *
   * @returns Current fill style value.
   */
  get fillStyle(): string {
    return this.fillStyleValue;
  }

  /**
   * Records font assignments.
   *
   * @param value - Font assigned by the renderer.
   */
  set font(value: string) {
    this.fontValue = value;
    this.calls.push(`font=${value}`);
  }

  /**
   * Returns the most recently assigned font.
   *
   * @returns Current font value.
   */
  get font(): string {
    return this.fontValue;
  }

  /**
   * Records stroke style assignments.
   *
   * @param value - Stroke style assigned by the renderer.
   */
  set strokeStyle(value: string) {
    this.calls.push(`strokeStyle=${value}`);
  }

  /**
   * Returns the current stroke style value.
   *
   * @returns Current stroke style value.
   */
  get strokeStyle(): string {
    return "";
  }

  /**
   * Records line width assignments.
   *
   * @param value - Line width assigned by the renderer.
   */
  set lineWidth(value: number) {
    this.calls.push(`lineWidth=${value}`);
  }

  /**
   * Returns the current line width value.
   *
   * @returns Current line width value.
   */
  get lineWidth(): number {
    return 1;
  }

  /**
   * Records line dash assignments.
   *
   * @param segments - Dash and gap lengths assigned by the renderer.
   */
  setLineDash(segments: readonly number[]): void {
    this.calls.push(`setLineDash(${segments.join(",")})`);
  }

  /**
   * Records line-cap assignments.
   *
   * @param value - Line cap assigned by the renderer.
   */
  set lineCap(value: CanvasLineCap) {
    this.calls.push(`lineCap=${value}`);
  }

  /**
   * Returns the current line cap value.
   *
   * @returns Current line cap value.
   */
  get lineCap(): CanvasLineCap {
    return "butt";
  }

  /**
   * Records a clear rectangle call.
   *
   * @param x - Rectangle x coordinate.
   * @param y - Rectangle y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   */
  clearRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`clearRect(${x},${y},${width},${height})`);
  }

  /**
   * Records a fill rectangle call.
   *
   * @param x - Rectangle x coordinate.
   * @param y - Rectangle y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   */
  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`fillRect(${x},${y},${width},${height})`);
  }

  /**
   * Records a fill text call.
   *
   * @param text - Text content to draw.
   * @param x - Text x coordinate.
   * @param y - Text baseline y coordinate.
   */
  fillText(text: string, x: number, y: number): void {
    this.calls.push(`fillText(${text},${x},${y})`);
  }

  /** Records a save call. */
  save(): void {
    this.calls.push("save()");
  }

  /** Records a restore call. */
  restore(): void {
    this.calls.push("restore()");
  }

  /**
   * Records an affine transform call.
   *
   * @param a - Horizontal scale/skew coefficient.
   * @param b - Vertical skew coefficient.
   * @param c - Horizontal skew coefficient.
   * @param d - Vertical scale/skew coefficient.
   * @param e - Horizontal translation.
   * @param f - Vertical translation.
   */
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ): void {
    this.calls.push(`transform(${a},${b},${c},${d},${e},${f})`);
  }

  /** Records a begin path call. */
  beginPath(): void {
    this.calls.push("beginPath()");
  }

  /**
   * Records a move-to path call.
   *
   * @param x - Point x coordinate.
   * @param y - Point y coordinate.
   */
  moveTo(x: number, y: number): void {
    this.calls.push(`moveTo(${x},${y})`);
  }

  /**
   * Records a line-to path call.
   *
   * @param x - Point x coordinate.
   * @param y - Point y coordinate.
   */
  lineTo(x: number, y: number): void {
    this.calls.push(`lineTo(${x},${y})`);
  }

  /**
   * Records a bezier curve path call.
   *
   * @param cp1x - First control point x coordinate.
   * @param cp1y - First control point y coordinate.
   * @param cp2x - Second control point x coordinate.
   * @param cp2y - Second control point y coordinate.
   * @param x - End point x coordinate.
   * @param y - End point y coordinate.
   */
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void {
    this.calls.push(`bezierCurveTo(${cp1x},${cp1y},${cp2x},${cp2y},${x},${y})`);
  }

  /**
   * Records a quadratic curve path call.
   *
   * @param cpx - Control point x coordinate.
   * @param cpy - Control point y coordinate.
   * @param x - End point x coordinate.
   * @param y - End point y coordinate.
   */
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.calls.push(`quadraticCurveTo(${cpx},${cpy},${x},${y})`);
  }

  /** Records a close path call. */
  closePath(): void {
    this.calls.push("closePath()");
  }

  /**
   * Records a rectangle path call.
   *
   * @param x - Rectangle x coordinate.
   * @param y - Rectangle y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   */
  rect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`rect(${x},${y},${width},${height})`);
  }

  /** Records a clip call. */
  clip(): void {
    this.calls.push("clip()");
  }

  /** Records a stroke call. */
  stroke(): void {
    this.calls.push("stroke()");
  }

  /** Records a fill call. */
  fill(): void {
    this.calls.push("fill()");
  }

  /**
   * Records an image draw call.
   *
   * @param image - Image source to draw.
   * @param coordinates - Source/destination coordinates accepted by Canvas.
   */
  drawImage(
    image: CanvasImageSource,
    ...coordinates: readonly number[]
  ): void {
    this.calls.push(
      `drawImage(${(image as { id: string }).id},${coordinates.join(",")})`
    );
  }
}

/** Text-only target that intentionally omits Canvas path APIs. */
class TextOnlyCanvas2DTarget {
  /** Calls observed while rendering. */
  readonly calls: string[] = [];

  private fillStyleValue = "";

  private fontValue = "";

  /**
   * Records fill style assignments.
   *
   * @param value - Fill style assigned by the renderer.
   */
  set fillStyle(value: string) {
    this.fillStyleValue = value;
    this.calls.push(`fillStyle=${value}`);
  }

  /**
   * Returns the most recently assigned fill style.
   *
   * @returns Current fill style value.
   */
  get fillStyle(): string {
    return this.fillStyleValue;
  }

  /**
   * Records font assignments.
   *
   * @param value - Font assigned by the renderer.
   */
  set font(value: string) {
    this.fontValue = value;
    this.calls.push(`font=${value}`);
  }

  /**
   * Returns the most recently assigned font.
   *
   * @returns Current font value.
   */
  get font(): string {
    return this.fontValue;
  }

  /**
   * Records a clear rectangle call.
   *
   * @param x - Rectangle x coordinate.
   * @param y - Rectangle y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   */
  clearRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`clearRect(${x},${y},${width},${height})`);
  }

  /**
   * Records a fill rectangle call.
   *
   * @param x - Rectangle x coordinate.
   * @param y - Rectangle y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   */
  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`fillRect(${x},${y},${width},${height})`);
  }

  /**
   * Records a fill text call.
   *
   * @param text - Text content to draw.
   * @param x - Text x coordinate.
   * @param y - Text baseline y coordinate.
   */
  fillText(text: string, x: number, y: number): void {
    this.calls.push(`fillText(${text},${x},${y})`);
  }
}

/** Fake glyph path source used by Canvas path painter tests. */
class FakeGlyphPathSource implements CanvasGlyphPathSource {
  /** Glyph path requests observed by the fake source. */
  readonly requests: CanvasGlyphPathRequest[] = [];

  /** Outlines keyed by font id, glyph id, and font family. */
  private readonly outlines: ReadonlyMap<string, CanvasGlyphPathOutline>;

  /**
   * Creates a fake glyph path source.
   *
   * @param entries - Outline entries keyed by `fontId:glyphId:fontFamily`.
   */
  constructor(entries: readonly (readonly [string, CanvasGlyphPathOutline])[]) {
    this.outlines = new Map(entries);
  }

  /**
   * Resolves a fake outline for a glyph request.
   *
   * @param request - Glyph path request made by the painter.
   * @returns Matching outline, or null when the fixture has none.
   */
  getGlyphPath(request: CanvasGlyphPathRequest): CanvasGlyphPathOutline | null {
    this.requests.push(request);

    return this.outlines.get(formatGlyphPathRequestKey(request)) ?? null;
  }
}

/**
 * Creates a display list with one glyph-run command for path painter fallback tests.
 *
 * @param glyphCoverage - Glyph coverage value to assign to the command.
 * @returns Display list containing one glyph-run command.
 */
function createSingleGlyphPathDisplayList(
  glyphCoverage: QuireGlyphRunCoverage = "complete"
): QuireDisplayList {
  return createSingleGlyphPathDisplayListWithGlyph(
    {
      glyphId: 65,
      sourceCluster: 0,
      x: 0,
      y: 0,
      xAdvance: 12,
      yAdvance: 0,
      xOffset: 0,
      yOffset: 0,
      fontId: "fixture-regular",
      fontFamily: "Fixture Serif"
    },
    glyphCoverage
  );
}

/**
 * Creates a display list with one caller-provided glyph placement.
 *
 * @param glyph - Glyph placement to attach to the command.
 * @param glyphCoverage - Glyph coverage value to assign to the command.
 * @returns Display list containing one glyph-run command.
 */
function createSingleGlyphPathDisplayListWithGlyph(
  glyph: QuireGlyphRunGlyphPlacement,
  glyphCoverage: QuireGlyphRunCoverage = "complete"
): QuireDisplayList {
  return {
    bounds: { x: 0, y: 0, width: 120, height: 40 },
    commands: [
      {
        id: "glyph-run",
        kind: "glyph-run",
        rect: { x: 8, y: 8, width: 50, height: 24 },
        text: "A",
        origin: { x: 8, y: 28 },
        font: "16px serif",
        fillStyle: "#111827",
        glyphCoverage,
        glyphs: [glyph]
      }
    ]
  };
}

/**
 * Formats a fake source key from one glyph path request.
 *
 * @param request - Glyph path request to format.
 * @returns Stable fake source key.
 */
function formatGlyphPathRequestKey(request: CanvasGlyphPathRequest): string {
  return `${request.fontId ?? ""}:${request.glyphId}:${request.fontFamily ?? ""}`;
}

/** Spy glyph-run painter that records command ownership. */
class SpyGlyphRunPainter implements CanvasGlyphRunPainter {
  /** Target used only as a shared call log. */
  private readonly target: SpyCanvas2DTarget;

  /**
   * Creates a spy glyph-run painter.
   *
   * @param target - Spy target whose calls should record painter activity.
   */
  constructor(target: SpyCanvas2DTarget) {
    this.target = target;
  }

  /**
   * Records that the glyph-run painter handled a command.
   *
   * @param command - Glyph-run command to paint.
   * @param context - Paint context supplied by the adapter.
   * @returns Always true because the spy fully handles the command.
   */
  paintGlyphRun(
    command: Parameters<CanvasGlyphRunPainter["paintGlyphRun"]>[0],
    context: Parameters<CanvasGlyphRunPainter["paintGlyphRun"]>[1]
  ): boolean {
    void context;
    this.target.calls.push(`paintGlyphRun(${command.text},${command.glyphs.length})`);

    return true;
  }
}
