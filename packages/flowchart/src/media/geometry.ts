import type { FlowchartImage, FlowchartImagePlacement, FlowchartImageRect } from "./types";

/** @param image - Valid original resource and optional source crop. @returns Retained rectangle in intrinsic pixels/viewBox units, before fitting it to any display frame. */
export function flowchartImageSourceRect(image: FlowchartImage): FlowchartImageRect {
  const crop = image.crop ?? { top: 0, right: 0, bottom: 0, left: 0 };
  return { x: image.width * crop.left, y: image.height * crop.top, width: image.width * (1 - (crop.left + crop.right)), height: image.height * (1 - (crop.top + crop.bottom)) };
}

/** @param image - Valid original resource and optional source crop. @param width - Node-frame width. @param height - Node-frame height. @returns Explicit image/clip rectangles in node-local coordinates, before mirroring or rotation. */
export function flowchartImagePlacement(image: FlowchartImage, width: number, height: number): FlowchartImagePlacement {
  const retained = flowchartImageSourceRect(image), retainedWidth = retained.width, retainedHeight = retained.height;
  const ratio = image.fit === "cover" ? Math.max(width / retainedWidth, height / retainedHeight) : Math.min(width / retainedWidth, height / retainedHeight);
  // Place the retained source first, then offset the unchanged original. Clip
  // to both authorities so contain's letterboxes never reveal removed pixels.
  const visibleWidth = retainedWidth * ratio, visibleHeight = retainedHeight * ratio;
  const left = (width - visibleWidth) / 2, top = (height - visibleHeight) / 2, clipX = Math.max(0, left), clipY = Math.max(0, top);
  return { x: left - retained.x * ratio, y: top - retained.y * ratio, width: image.width * ratio, height: image.height * ratio,
    clip: { x: clipX, y: clipY, width: Math.min(width, left + visibleWidth) - clipX, height: Math.min(height, top + visibleHeight) - clipY } };
}
