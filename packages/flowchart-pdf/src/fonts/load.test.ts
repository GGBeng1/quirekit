import { afterEach, expect, it, vi } from "vitest";
import { loadFlowchartPdfFont } from "./load";
afterEach(() => vi.unstubAllGlobals());
it("bounds streamed fonts, cancels the reader and never reuses a cancelled response", async () => {
  let cancelled = 0;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(20 * 1024 * 1024 + 1)); }, cancel() { cancelled++; } }))));
  await expect(loadFlowchartPdfFont("/approved.ttf", new AbortController().signal)).rejects.toThrow("资源预算"); expect(cancelled).toBe(1);
  const control = new AbortController(); control.abort(); await expect(loadFlowchartPdfFont("/approved.ttf", control.signal)).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});
