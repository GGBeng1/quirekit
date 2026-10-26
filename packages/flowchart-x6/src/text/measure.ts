import type { CaptionMeasure } from "./types";

const contexts = new WeakMap<Document, CanvasRenderingContext2D>();
/** @param document - Actual graph font/DOM owner. @param family - Current font stack. @returns Bounded per-layout measurement cache with no graph or viewport dependencies. */
export function captionMeasure(document: Document, family: string): CaptionMeasure {
  let context = contexts.get(document);
  if (!context) { context = document.createElement("canvas").getContext("2d") ?? undefined; if (!context) throw new Error("文字测量不可用"); contexts.set(document, context); }
  const cache = new Map<string, number>(), owner = context;
  return (text, format) => {
    const font = `${format.italic ? "italic" : "normal"} ${format.bold ? 600 : 400} ${format.fontSize}px ${family}`, key = `${font}:${text}`, previous = cache.get(key);
    if (previous !== undefined) return previous;
    owner.font = font; const width = owner.measureText(text).width;
    if (cache.size === 256) cache.delete(cache.keys().next().value!); cache.set(key, width); return width;
  };
}
