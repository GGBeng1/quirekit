import type { EditorUIOverlayRect } from "./types";

/** @param viewport - Product scroll owner. @returns Its visible client area, or null while unmeasurable. */
export function readOverlayViewport(viewport: HTMLElement): EditorUIOverlayRect | null {
  const rect = viewport.getBoundingClientRect();
  const view = viewport.ownerDocument.defaultView;
  if (!view || rect.width <= 0 || rect.height <= 0) return null;
  const visual = view.visualViewport;
  const left = Math.max(rect.left + viewport.clientLeft, visual?.offsetLeft ?? 0);
  const top = Math.max(rect.top + viewport.clientTop, visual?.offsetTop ?? 0);
  const right = Math.min(rect.left + viewport.clientLeft + (viewport.clientWidth || rect.width),
    (visual?.offsetLeft ?? 0) + (visual?.width ?? view.innerWidth));
  const bottom = Math.min(rect.top + viewport.clientTop + (viewport.clientHeight || rect.height),
    (visual?.offsetTop ?? 0) + (visual?.height ?? view.innerHeight));
  return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}
