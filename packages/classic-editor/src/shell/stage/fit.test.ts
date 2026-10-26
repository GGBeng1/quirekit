import { describe, expect, it } from "vitest";
import { calculateContentFitZoom, calculateFitZoom, findReadingPage, calculateFitRailWidth } from "./fit";

describe("Classic fit zoom geometry", () => {
  it("fits body margins instead of paper while leaving a touch gutter", () => {
    const body = { x: 120, y: 90, width: 552, height: 900 };
    expect(calculateContentFitZoom(body, 440)).toBe(75);
    expect(calculateContentFitZoom(body, 375)).toBe(63);
    expect(calculateContentFitZoom(body, 0)).toBeUndefined();
    expect(calculateContentFitZoom(undefined, 440)).toBeUndefined();
  });
  it("fits width and the tallest sheet with an independent readable rail", () => {
    expect(calculateFitRailWidth(1200, true)).toBe(300);
    expect(calculateFitRailWidth(600, true)).toBe(240);
    expect(calculateFitRailWidth(1600, true)).toBe(340);
    expect(calculateFitRailWidth(1200, false)).toBe(0);
    expect(calculateFitZoom("fit-width", 1000, 1400, 1239, 850, 300)).toBe(90);
    expect(calculateFitZoom("fit-page", 1000, 1400, 1239, 850, 300)).toBe(58);
    expect(calculateFitZoom("fit-page", 1400, 1000, 900, 1200, 0)).toBe(62);
  });

  it("defers empty measurements and respects the existing zoom bounds", () => {
    expect(calculateFitZoom("fit-width", 800, 1100, 0, 900, 0)).toBeUndefined();
    expect(calculateFitZoom("fit-page", 800, 0, 1000, 900, 0)).toBeUndefined();
    expect(calculateFitZoom("fit-width", 800, 1100, 200, 900, 240)).toBe(25);
    expect(calculateFitZoom("fit-width", 100, 140, 1000, 900, 0)).toBe(400);
  });

  it("finds the nearest reading page in logarithmic work without walking the document", () => {
    const pages = Array.from({ length: 10000 }, (_, index) => ({
      pageRect: { x: 0, y: index * 1200 + 16, width: 800, height: 1100 }
    }));
    let reads = 0;
    const measured = new Proxy(pages, { get(target, key, receiver) {
      if (typeof key === "string" && /^\d+$/.test(key)) reads++;
      return Reflect.get(target, key, receiver);
    } });
    expect(findReadingPage(measured, 7432 * 1200 + 600)).toBe(pages[7432]!.pageRect);
    expect(reads).toBeLessThan(22);
    expect(findReadingPage(pages, -500)).toBe(pages[0]!.pageRect);
    expect(findReadingPage(pages, Infinity)).toBe(pages.at(-1)!.pageRect);
    expect(findReadingPage([], 500)).toBeUndefined();
  });
});
