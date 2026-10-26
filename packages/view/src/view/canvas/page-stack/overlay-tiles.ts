import {
  readQuireDisplayCommandPaintBounds,
  renderCanvasDisplayList,
  type CanvasGlyphRunPainter,
  type QuireDisplayCommand,
  type QuireDisplayList,
  type QuireRect
} from "@quirekit/renderer";
import { resolveCanvasSurfaceTarget } from "../surface";
import type { CanvasPageStackFrame } from "./frames";

/** Grid cell edge in CSS px: corner marks fit one cell, large selections stay few canvases. */
const tileSize = 256;
/** Planned tile area at which one page-sized canvas costs about the same. */
const denseAreaRatio = 0.9;
/** Tile count above which compositing many small layers outweighs the saved pixels. */
const maxTiles = 12;
/** Canvases holding overlay ink beyond each frame's own overlay canvas, keyed by frame element. */
const extraTiles = new WeakMap<Element, HTMLCanvasElement[]>();

/**
 * Plans the document-space rectangles that need overlay pixels on one page.
 *
 * Overlay content is usually sparse (body corner marks, a caret, a selection),
 * so only grid cells touched by conservative ink bounds receive a canvas.
 * Unknown bounds and large ink areas fall back to the whole page.
 *
 * @param displayList - Page-scoped overlay display list.
 * @param pageRect - Page rectangle in document space.
 * @returns Tile rectangles in row-major order; empty when nothing paints.
 */
export function planCanvasPageOverlayTiles(displayList: QuireDisplayList, pageRect: QuireRect): readonly QuireRect[] {
  const columns = Math.max(1, Math.ceil(pageRect.width / tileSize));
  const rows = Math.max(1, Math.ceil(pageRect.height / tileSize));
  const cells = new Set<number>();
  for (const command of displayList.commands) {
    const inks = readOverlayInkBounds(command);
    if (inks === null) return [pageRect];
    for (const ink of inks) {
      const left = Math.max(ink.x, pageRect.x) - pageRect.x;
      const top = Math.max(ink.y, pageRect.y) - pageRect.y;
      const right = Math.min(ink.x + ink.width, pageRect.x + pageRect.width) - pageRect.x;
      const bottom = Math.min(ink.y + ink.height, pageRect.y + pageRect.height) - pageRect.y;
      if (right <= left || bottom <= top) continue;
      for (let row = Math.floor(top / tileSize); row <= Math.min(rows - 1, Math.floor(bottom / tileSize)); row += 1) {
        for (let column = Math.floor(left / tileSize); column <= Math.min(columns - 1, Math.floor(right / tileSize)); column += 1) {
          cells.add(row * columns + column);
        }
      }
    }
  }
  if (cells.size > maxTiles) return [pageRect];
  const tiles = [...cells].sort((left, right) => left - right).map((cell) => {
    const x = pageRect.x + (cell % columns) * tileSize;
    const y = pageRect.y + Math.floor(cell / columns) * tileSize;
    return {
      x, y,
      width: Math.min(tileSize, pageRect.x + pageRect.width - x),
      height: Math.min(tileSize, pageRect.y + pageRect.height - y)
    };
  });
  const area = tiles.reduce((sum, tile) => sum + tile.width * tile.height, 0);
  return area >= denseAreaRatio * pageRect.width * pageRect.height ? [pageRect] : tiles;
}

/**
 * Paints one page overlay into canvases that cover only its planned ink.
 *
 * The frame's overlay canvas holds the first tile and sibling canvases hold the
 * rest. Every tile replays the complete list clipped by its own bounds, with the
 * device-pixel origin of the page-sized canvas, so pixels match a full-page paint.
 *
 * @param frame - Mounted page frame.
 * @param displayList - Page-scoped overlay display list.
 * @param devicePixelRatio - Backing-store scale of the frame.
 * @param glyphRunPainter - Optional glyph-run painter.
 * @returns Planned tile rectangles, which callers fold into the paint signature.
 */
export function paintCanvasPageStackOverlay(
  frame: CanvasPageStackFrame,
  displayList: QuireDisplayList,
  devicePixelRatio: number,
  glyphRunPainter?: CanvasGlyphRunPainter
): readonly QuireRect[] {
  const rects = planCanvasPageOverlayTiles(displayList, frame.pageRect);
  const canvases = syncOverlayTileCanvases(frame, Math.max(rects.length, 1));
  if (rects.length === 0) {
    placeOverlayCanvas(frame.overlay, 0, 0, 1, 1, devicePixelRatio);
    resolveCanvasSurfaceTarget(frame.overlay)?.clearRect(0, 0, 1, 1);
    return rects;
  }
  rects.forEach((rect, index) => {
    const canvas = canvases[index]!;
    // Integer device-pixel origins keep tile pixels identical to a page-sized canvas.
    const originX = Math.round((rect.x - frame.pageRect.x) * devicePixelRatio);
    const originY = Math.round((rect.y - frame.pageRect.y) * devicePixelRatio);
    const width = Math.round((rect.x + rect.width - frame.pageRect.x) * devicePixelRatio) - originX;
    const height = Math.round((rect.y + rect.height - frame.pageRect.y) * devicePixelRatio) - originY;
    placeOverlayCanvas(canvas, originX, originY, width, height, devicePixelRatio);
    const target = resolveCanvasSurfaceTarget(canvas) as CanvasRenderingContext2D | undefined;
    if (target === undefined) return;
    target.setTransform?.(devicePixelRatio, 0, 0, devicePixelRatio,
      -frame.pageRect.x * devicePixelRatio - originX, -frame.pageRect.y * devicePixelRatio - originY);
    renderCanvasDisplayList({
      displayList: { ...displayList, bounds: rect },
      target,
      ...(glyphRunPainter === undefined ? {} : { glyphRunPainter })
    });
  });
  return rects;
}

/**
 * Releases the sibling tiles of a frame that leaves its page; the next paint plans again.
 *
 * @param frame - Frame element owning the tiles, if any.
 */
export function releaseCanvasPageOverlayTiles(frame: Element | null): void {
  if (frame === null) return;
  for (const tile of extraTiles.get(frame) ?? []) {
    tile.width = tile.height = 0;
    tile.remove();
  }
  extraTiles.delete(frame);
}

/**
 * Reads conservative ink rectangles for one overlay command.
 *
 * @param command - Overlay display command.
 * @returns Ink rectangles, or null when the bounds are unknown.
 */
function readOverlayInkBounds(command: QuireDisplayCommand): readonly QuireRect[] | null {
  // Glyph outlines can overhang their advance boxes; keep them on a page-sized canvas.
  if (command.kind === "text" || command.kind === "glyph-run") return null;
  if (command.kind !== "path") {
    const bounds = readQuireDisplayCommandPaintBounds(command);
    return bounds === null ? null : [inflateRect(bounds, 2)];
  }
  // Default miter joins (limit 10) reach five line widths from a corner.
  const margin = command.strokeStyle === undefined ? 1 : (command.lineWidth ?? 1) * 5 + 1;
  const subpaths: QuireRect[] = [];
  let points: { readonly x: number; readonly y: number }[] = [];
  const flush = (): void => {
    if (points.length === 0) return;
    const xs = points.map((point) => point.x), ys = points.map((point) => point.y);
    subpaths.push(inflateRect({ x: Math.min(...xs), y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }, margin));
    points = [];
  };
  for (const segment of command.segments) {
    if (segment.kind === "move-to") flush();
    if (segment.kind === "quadratic-curve-to") points.push(segment.control);
    if (segment.kind === "bezier-curve-to") points.push(segment.control1, segment.control2);
    if (segment.kind !== "close-path") points.push(segment.point);
  }
  flush();
  return subpaths.every((rect) => [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) ? subpaths : null;
}

/**
 * @param rect - Rectangle to grow.
 * @param amount - Distance added on every side.
 * @returns Grown rectangle.
 */
function inflateRect(rect: QuireRect, amount: number): QuireRect {
  return { x: rect.x - amount, y: rect.y - amount, width: rect.width + amount * 2, height: rect.height + amount * 2 };
}

/**
 * Keeps exactly `count` overlay canvases in the frame, reusing existing tiles.
 *
 * @param frame - Mounted page frame.
 * @param count - Required canvases including the frame overlay canvas.
 * @returns Canvases in tile order.
 */
function syncOverlayTileCanvases(frame: CanvasPageStackFrame, count: number): readonly HTMLCanvasElement[] {
  const tiles = extraTiles.get(frame.frame) ?? [];
  while (tiles.length < count - 1) {
    const tile = frame.overlay.ownerDocument.createElement("canvas");
    tile.className = frame.overlay.className;
    tile.dataset.qkSurface = "overlay";
    tile.dataset.qkOverlayTile = "";
    tiles.push(tile);
  }
  for (const tile of tiles.splice(count - 1)) {
    tile.width = tile.height = 0;
    tile.remove();
  }
  for (const tile of tiles) if (tile.parentNode !== frame.frame) frame.frame.appendChild(tile);
  extraTiles.set(frame.frame, tiles);
  return [frame.overlay, ...tiles];
}

/**
 * Positions one overlay canvas in page-local CSS px and sizes its backing store.
 *
 * @param canvas - Overlay canvas or tile.
 * @param originX - Device-pixel x offset from the page origin.
 * @param originY - Device-pixel y offset from the page origin.
 * @param width - Backing-store width in device pixels.
 * @param height - Backing-store height in device pixels.
 * @param devicePixelRatio - Backing-store scale.
 */
function placeOverlayCanvas(canvas: HTMLCanvasElement, originX: number, originY: number, width: number, height: number, devicePixelRatio: number): void {
  canvas.style.left = `${originX / devicePixelRatio}px`;
  canvas.style.top = `${originY / devicePixelRatio}px`;
  canvas.style.width = `${width / devicePixelRatio}px`;
  canvas.style.height = `${height / devicePixelRatio}px`;
  if (canvas.width === width && canvas.height === height) return;
  if (canvas.width !== width && canvas.height !== height) canvas.height = 0;
  canvas.width = width;
  canvas.height = height;
}
