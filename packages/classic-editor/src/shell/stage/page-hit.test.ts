import { describe, expect, it } from "vitest";
import { containsClassicEditorPagePoint, readClassicEditorPageRect } from "./page-hit";

describe("Classic paper membership", () => {
  const pages = [
    { pageRect: { x: 20, y: 10, width: 800, height: 1000 } },
    { pageRect: { x: 120, y: 1030, width: 600, height: 300 } },
    { pageRect: { x: 0, y: 1350, width: 900, height: 1400 } }
  ];

  it.each([
    [20, 10, true], [30, 20, true], [810, 1000, true],
    [19, 100, false], [821, 100, false], [400, 9, false],
    [400, 1020, false], [400, 1340, false], [400, 2751, false],
    [121, 1031, true], [121, 1329, true], [30, 1100, false],
    [721, 1100, false], [899, 2749, true]
  ])("checks (%s, %s) against each sheet's full rectangle", (x, y, expected) => {
    expect(containsClassicEditorPagePoint(pages, { x, y })).toBe(expected);
  });

  it("rejects missing paper and bounds page reads on long documents", () => {
    expect(containsClassicEditorPagePoint([], { x: 0, y: 0 })).toBe(false);
    let reads = 0;
    const many = Array.from({ length: 4096 }, (_, index) => ({
      get pageRect() { reads++; return { x: 0, y: index * 1020, width: 800, height: 1000 }; }
    }));
    expect(containsClassicEditorPagePoint(many, { x: 20, y: 4095 * 1020 + 20 })).toBe(true);
    expect(reads).toBeLessThanOrEqual(14);
  });

  it("projects mixed sheet widths from live reading zoom and native scroll without page DOM", () => {
    const bounds = { x: 0, y: 0, width: 900, height: 2750 };
    const rect = { left: -120, top: -900, width: 450 };
    const mount = { getBoundingClientRect: () => rect } as HTMLElement;
    expect(readClassicEditorPageRect(pages, bounds, mount, -850)).toEqual({ x: -110, y: -895, width: 400, height: 500 });
    expect(readClassicEditorPageRect(pages, bounds, mount, -350)).toEqual({ x: -60, y: -385, width: 300, height: 150 });
    rect.left -= 80;
    rect.top -= 200;
    expect(readClassicEditorPageRect(pages, bounds, mount, -550)).toEqual({ x: -140, y: -585, width: 300, height: 150 });
    expect(readClassicEditorPageRect(pages, bounds, mount, -590)).toBeUndefined();
    expect(readClassicEditorPageRect(pages, undefined, mount, -550)).toBeUndefined();
    expect(readClassicEditorPageRect(undefined, bounds, mount, -550)).toBeUndefined();
    expect(readClassicEditorPageRect(pages, bounds, mount, NaN)).toBeUndefined();
    rect.width = 0;
    expect(readClassicEditorPageRect(pages, bounds, mount, -550)).toBeUndefined();
  });

  it("bounds offscreen sheet lookup independently of document length", () => {
    let reads = 0;
    const pages = Array.from({ length: 4096 }, (_, index) => ({
      get pageRect() { reads++; return { x: 0, y: index * 1020, width: 800, height: 1000 }; }
    }));
    const bounds = { x: 0, y: 0, width: 800, height: 4096 * 1020 };
    const mount = { getBoundingClientRect: () => ({ left: -40, top: -3000, width: 1000 }) } as HTMLElement;
    expect(readClassicEditorPageRect(pages, bounds, mount, 4095 * 1020 * 1.25 - 2990))
      .toEqual({ x: -40, y: 4095 * 1020 * 1.25 - 3000, width: 1000, height: 1250 });
    expect(reads).toBeLessThanOrEqual(14);
  });
});
