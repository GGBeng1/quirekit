import { EditorView } from "@quirekit/cm-view";
import type { SourceScrollStep, SourceViewportBounds } from "./types";

/** @param element - Current composed-tree member. @returns Its scrolling ancestor, including shadow hosts. */
function parentElement(element: HTMLElement): HTMLElement | null {
  const root = element.getRootNode();
  return element.assignedSlot ?? element.parentElement ?? ("host" in root ? (root as ShadowRoot).host as HTMLElement : null);
}

/** @param view - Mounted source and host-margin authority. @returns Actual visible client-space editing region. */
export function sourceViewport(view: EditorView): SourceViewportBounds {
  const doc = view.dom.ownerDocument, win = doc.defaultView!, visual = win.visualViewport;
  let top = visual?.offsetTop ?? 0, bottom = top + (visual?.height ?? win.innerHeight);
  let left = visual?.offsetLeft ?? 0, right = left + (visual?.width ?? win.innerWidth);
  let above = 0, below = 0, before = 0, after = 0;
  for (const provider of view.state.facet(EditorView.scrollMargins)) {
    const margins = provider(view);
    above = Math.max(above, margins?.top ?? 0); below = Math.max(below, margins?.bottom ?? 0);
    before = Math.max(before, margins?.left ?? 0); after = Math.max(after, margins?.right ?? 0);
  }
  // Chrome obscures the visible viewport, not every document-height ancestor.
  // Inset that boundary first. Subtracting a dock again from a short scroller's
  // end falsely occludes its last line forever, producing repeated input scroll.
  top += above; bottom = Math.max(top, bottom - below); left += before; right = Math.max(left, right - after);
  for (let element: HTMLElement | null = view.scrollDOM; element && element !== doc.body && element !== doc.documentElement; element = parentElement(element)) {
    const style = win.getComputedStyle(element);
    const clipY = /hidden|clip/u.test(style.overflowY) || /auto|scroll/u.test(style.overflowY) && element.scrollHeight > element.clientHeight;
    const clipX = /hidden|clip/u.test(style.overflowX) || /auto|scroll/u.test(style.overflowX) && element.scrollWidth > element.clientWidth;
    if (!clipY && !clipX) continue;
    const box = element.getBoundingClientRect(), scaleY = element.offsetHeight ? box.height / element.offsetHeight : 1;
    const scaleX = element.offsetWidth ? box.width / element.offsetWidth : 1;
    if (clipY) { const start = box.top + element.clientTop * scaleY; top = Math.max(top, start); bottom = Math.min(bottom, start + element.clientHeight * scaleY); }
    if (clipX) { const start = box.left + element.clientLeft * scaleX; left = Math.max(left, start); right = Math.min(right, start + element.clientWidth * scaleX); }
  }
  return { top, bottom: Math.max(top, bottom), left, right: Math.max(left, right) };
}

/**
 * Measures one nearest scrollable owner; exhausted inner scrollers hand off to the page.
 * @param view - Source surface inside possibly nested scrolling containers.
 * @param delta - Desired vertical movement in client CSS pixels.
 * @returns One clamped scroll write, or null when every ancestor reached its boundary.
 */
export function sourceScrollStep(view: EditorView, delta: number): SourceScrollStep | null {
  if (!delta) return null;
  const doc = view.dom.ownerDocument, win = doc.defaultView!;
  for (let element: HTMLElement | null = view.scrollDOM; element && element !== doc.body && element !== doc.documentElement; element = parentElement(element)) {
    if (!/auto|scroll/u.test(win.getComputedStyle(element).overflowY) || element.scrollHeight <= element.clientHeight) continue;
    const box = element.getBoundingClientRect(), scale = element.offsetHeight ? box.height / element.offsetHeight : 1;
    const top = Math.max(0, Math.min(element.scrollHeight - element.clientHeight, element.scrollTop + delta / (scale || 1)));
    if (Math.abs(top - element.scrollTop) > 0.01) return { owner: element, top, left: element.scrollLeft };
  }
  const root = doc.scrollingElement ?? doc.documentElement;
  const top = Math.max(0, Math.min(root.scrollHeight - root.clientHeight, win.scrollY + delta));
  return Math.abs(top - win.scrollY) > 0.01 ? { owner: win, top, left: win.scrollX } : null;
}

/** @param step - Previously measured vertical scroll intent. */
export function applySourceScrollStep(step: SourceScrollStep): void {
  if ("document" in step.owner) step.owner.scrollTo({ top: step.top, left: step.left, behavior: "instant" });
  else step.owner.scrollTop = step.top;
}
