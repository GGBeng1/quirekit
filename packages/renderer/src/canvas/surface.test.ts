import { describe, expect, it, vi } from "vitest";
import { createCanvas2DDrawSurface } from "./surface";
import type { QuireClipCommand } from "../core/display-list";
import type { Canvas2DRenderTarget } from "./types";

describe("createCanvas2DDrawSurface", () => {
  it("scales glyph paint once around its origin and restores the transform on failure", () => {
    const save = vi.fn(), restore = vi.fn(), transform = vi.fn();
    const fillText = vi.fn();
    const target = { save, restore, transform, fillText, letterSpacing: "0px", globalAlpha: 1 } as unknown as Canvas2DRenderTarget;
    const surface = createCanvas2DDrawSurface(target);
    const command = { id: "scaled", kind: "text" as const, text: "AB", font: "16px Fixture",
      rect: { x: 20, y: 30, width: 44, height: 20 }, origin: { x: 20, y: 46 }, fillStyle: "#000",
      horizontalScale: 2, letterSpacing: 2 };
    surface.fillText(command);
    expect(transform).toHaveBeenCalledWith(2, 0, 0, 1, -20, 0);
    expect(fillText).toHaveBeenCalledWith("AB", 20, 46);
    expect(target.letterSpacing).toBe("1px");
    expect(restore).toHaveBeenCalledTimes(1);
    fillText.mockImplementationOnce(() => { throw new Error("paint failed"); });
    expect(() => surface.fillText(command)).toThrow("paint failed");
    expect(save).toHaveBeenCalledTimes(2);
    expect(restore).toHaveBeenCalledTimes(2);
  });

  it("passes unscaled glyph positions to outline painters inside the width transform", () => {
    const paintGlyphRun = vi.fn((_command: unknown) => true);
    const target = { save: vi.fn(), restore: vi.fn(), transform: vi.fn() } as unknown as Canvas2DRenderTarget;
    const surface = createCanvas2DDrawSurface(target, { glyphRunPainter: { paintGlyphRun } });
    surface.fillGlyphRun({ id: "scaled-glyph", kind: "glyph-run", text: "A", font: "16px Fixture",
      rect: { x: 20, y: 30, width: 22, height: 20 }, origin: { x: 20, y: 46 }, fillStyle: "#000",
      horizontalScale: 2, letterSpacing: 2, glyphCoverage: "complete", glyphs: [{ glyphId: 1, sourceCluster: 0,
        x: 6, y: 3, xAdvance: 20, yAdvance: 0, xOffset: 2, yOffset: 1 }] });
    expect(paintGlyphRun.mock.calls[0]![0]).toMatchObject({
      horizontalScale: 1, letterSpacing: 1, rect: { x: 20, width: 11 },
      glyphs: [{ x: 3, y: 3, xAdvance: 10, xOffset: 1, yOffset: 1 }]
    });
  });

  it("applies and restores transient command opacity", () => {
    const paintedAlphas: number[] = [];
    const target = {
      globalAlpha: 1,
      fillText: () => paintedAlphas.push(target.globalAlpha!),
      fillStyle: "#000",
      font: "16px sans-serif"
    } as unknown as Canvas2DRenderTarget;
    const surface = createCanvas2DDrawSurface(target);

    surface.fillText({
      id: "inactive-story",
      kind: "text",
      opacity: 0.55,
      rect: { x: 0, y: 0, width: 40, height: 20 },
      text: "Header",
      origin: { x: 0, y: 16 },
      font: "16px sans-serif",
      fillStyle: "#111827"
    });

    expect(paintedAlphas).toEqual([0.55]);
    expect(target.globalAlpha).toBe(1);
  });

  it("sets and resets native canvas character spacing per command", () => {
    const paintedSpacing: string[] = [];
    const target = {
      letterSpacing: "0px",
      fillText: () => paintedSpacing.push(target.letterSpacing ?? ""),
      fillStyle: "#000",
      font: "16px sans-serif"
    } as unknown as Canvas2DRenderTarget;
    const surface = createCanvas2DDrawSurface(target);
    const base = {
      kind: "text" as const,
      rect: { x: 0, y: 0, width: 40, height: 20 },
      text: "AB",
      origin: { x: 0, y: 16 },
      font: "16px sans-serif",
      fillStyle: "#111827"
    };

    surface.fillText({ ...base, id: "spaced", letterSpacing: 2 });
    surface.fillText({ ...base, id: "normal" });

    expect(paintedSpacing).toEqual(["2px", "0px"]);
  });

  it("strokes native text without filling for outline-only commands", () => {
    const calls: string[] = [];
    const target = {
      fillStyle: "#000000",
      strokeStyle: "#000000",
      lineWidth: 1,
      font: "16px sans-serif",
      fillText: () => calls.push("fill"),
      strokeText: (text: string, x: number, y: number) =>
        calls.push(`stroke:${text}:${x}:${y}:${target.strokeStyle}:${target.lineWidth}`)
    } as unknown as Canvas2DRenderTarget;
    const surface = createCanvas2DDrawSurface(target);

    surface.fillText({
      id: "outline",
      kind: "text",
      rect: { x: 4, y: 4, width: 40, height: 20 },
      text: "AB",
      origin: { x: 4, y: 20 },
      font: "16px sans-serif",
      fillStyle: "#123456",
      paintMode: "stroke",
      strokeStyle: "#654321",
      lineWidth: 1.25
    });

    expect(calls).toEqual(["stroke:AB:4:20:#654321:1.25"]);
  });

  it("fails closed when a minimal target cannot stroke outlined text", () => {
    const target = {
      fillStyle: "#000000",
      font: "16px sans-serif",
      fillText: () => undefined
    } as unknown as Canvas2DRenderTarget;
    const surface = createCanvas2DDrawSurface(target);

    expect(() => surface.fillText({
      id: "unsupported-outline",
      kind: "text",
      rect: { x: 0, y: 0, width: 20, height: 20 },
      text: "A",
      origin: { x: 0, y: 16 },
      font: "16px sans-serif",
      fillStyle: "#111827",
      paintMode: "stroke"
    })).toThrow("Canvas target must support strokeText");
  });

  it("restores the clip even when the inner draw throws", () => {
    const calls: string[] = [];
    const target = {
      save: () => calls.push("save"),
      beginPath: () => calls.push("beginPath"),
      rect: () => calls.push("rect"),
      clip: () => calls.push("clip"),
      restore: () => calls.push("restore")
    } as unknown as Canvas2DRenderTarget;
    const surface = createCanvas2DDrawSurface(target);
    const command: QuireClipCommand = {
      id: "clip-0",
      kind: "clip",
      rect: { x: 0, y: 0, width: 10, height: 10 },
      commands: []
    };

    expect(() =>
      surface.withClip(command, () => {
        throw new Error("boom");
      })
    ).toThrow("boom");
    expect(calls).toContain("restore");
  });
});
