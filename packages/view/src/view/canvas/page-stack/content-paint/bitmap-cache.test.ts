// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { CanvasPageContentBitmapCache } from "./bitmap-cache";

it("releases native backing stores on replacement, eviction and destruction", () => {
  const target = { drawImage: vi.fn() };
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(target as unknown as CanvasRenderingContext2D);
  const create = vi.spyOn(document, "createElement");
  const source = document.createElement("canvas");
  source.width = source.height = 16;
  const cache = new CanvasPageContentBitmapCache(1024);
  try {
    cache.store(1, source);
    const first = create.mock.results.at(-1)!.value as HTMLCanvasElement;
    cache.store(1, source);
    const replacement = create.mock.results.at(-1)!.value as HTMLCanvasElement;
    expect([first.width, first.height]).toEqual([0, 0]);
    cache.store(2, source);
    const retained = create.mock.results.at(-1)!.value as HTMLCanvasElement;
    expect([replacement.width, replacement.height]).toEqual([0, 0]);
    expect(retained.width).toBe(16);
    cache.clear();
    expect([retained.width, retained.height]).toEqual([0, 0]);
    expect(cache.snapshot().bytes).toBe(0);
    expect(source.width).toBe(16);
  } finally { create.mockRestore(); getContext.mockRestore(); }
});

it("reserves the byte budget before copying a replacement or another page", () => {
  const cache = new CanvasPageContentBitmapCache(1024);
  const target = { drawImage: vi.fn(() => {
    // The new 16 × 16 copy must fit while every retained old artifact is still alive.
    expect(cache.snapshot().bytes + 1024).toBeLessThanOrEqual(1024);
  }) };
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(target as unknown as CanvasRenderingContext2D);
  const source = document.createElement("canvas");
  source.width = source.height = 16;
  try {
    expect(cache.store(1, source)).toBe(true);
    expect(cache.store(1, source)).toBe(true);
    expect(cache.store(2, source)).toBe(true);
    expect(cache.has(1)).toBe(false);
    expect(cache.snapshot()).toMatchObject({ bytes: 1024, entries: 1, replacements: 1, evictions: 1 });
  } finally { cache.clear(); context.mockRestore(); }
});

it("releases a temporary backing store when copying fails", () => {
  const failure = new Error("copy failed");
  const target = { drawImage: () => { throw failure; } };
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(target as unknown as CanvasRenderingContext2D);
  const create = vi.spyOn(document, "createElement");
  const source = document.createElement("canvas");
  source.width = source.height = 16;
  const cache = new CanvasPageContentBitmapCache(1024);
  try {
    expect(() => cache.store(1, source)).toThrow(failure);
    const artifact = create.mock.results.at(-1)!.value as HTMLCanvasElement;
    expect([artifact.width, artifact.height]).toEqual([0, 0]);
    expect(cache.snapshot().bytes).toBe(0);
    expect(cache.has(1)).toBe(false);
  } finally { create.mockRestore(); context.mockRestore(); }
});

it("evicts least recently used bitmaps when the budget is lowered", () => {
  const target = { drawImage: vi.fn() };
  const context = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(target as unknown as CanvasRenderingContext2D);
  const source = document.createElement("canvas");
  source.width = source.height = 16;
  const cache = new CanvasPageContentBitmapCache(2048);
  try {
    cache.store(1, source);
    cache.store(2, source);
    cache.setMaxBytes(1024);
    expect([cache.has(1), cache.has(2)]).toEqual([false, true]);
    cache.setMaxBytes(0);
    expect(cache.snapshot()).toMatchObject({ entries: 0, bytes: 0, maxBytes: 0 });
    expect(cache.store(3, source)).toBe(false);
  } finally { cache.clear(); context.mockRestore(); }
});
