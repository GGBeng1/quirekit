import type { Editor } from "@quirekit/core";
import type { BlockActionTarget } from "../../../ui/blocks/types";
import type { BlockDragSnapshot } from "./types";
import { cloneBlockPresentation } from "./clone";

/**
 * Captures only selected source blocks once after the drag threshold is crossed.
 * @param editor - Public mounted geometry owner.
 * @param target - Frozen canonical source membership.
 * @param viewport - Product clipping owner.
 * @param press - Initial handle press in client CSS coordinates.
 * @returns Owned visual tree or null when source DOM is unavailable.
 */
export function captureBlockDragSnapshot(editor: Editor, target: BlockActionTarget, viewport: HTMLElement, press: PointerEvent): BlockDragSnapshot | null {
  const sources = target.blocks.map(block => editor.view.nodeDOM?.(block.from)).filter((dom): dom is HTMLElement => dom instanceof HTMLElement);
  if (!sources.length) return null;
  const rects = sources.map(source => source.getBoundingClientRect());
  const left = Math.min(...rects.map(rect => rect.left)), top = Math.min(...rects.map(rect => rect.top));
  const width = Math.max(...rects.map(rect => rect.right)) - left;
  const height = Math.min(Math.max(...rects.map(rect => rect.bottom)) - top, viewport.clientHeight - 24);
  const dom = viewport.ownerDocument.createElement("div");
  dom.className = "qk-block-editor__content qk-prose qk-prose--compact qk-block-drag-snapshot";
  dom.inert = true; dom.setAttribute("aria-hidden", "true");
  Object.assign(dom.style, { position: "relative", width: `${width}px`, height: `${height}px`, minHeight: "0" });
  // Preserve source offsets and inherited typography without cloning ancestors,
  // their layout wrappers, or the View's selection/caret surfaces.
  sources.forEach((source, index) => {
    const rect = rects[index]!, style = getComputedStyle(source), copy = cloneBlockPresentation(source);
    for (const property of ["font-family", "font-size", "font-weight", "font-style", "line-height", "color", "letter-spacing", "word-spacing", "text-align", "direction"]) {
      copy.style.setProperty(property, style.getPropertyValue(property));
    }
    Object.assign(copy.style, { position: "absolute", left: `${rect.left - left}px`, top: `${rect.top - top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`, margin: "0", boxSizing: "border-box" });
    dom.append(copy);
  });
  return { dom, width: Math.min(width, viewport.clientWidth - 16), height, offset: { x: left - press.clientX, y: top - press.clientY } };
}
