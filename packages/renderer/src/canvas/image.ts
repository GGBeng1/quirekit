import { resolveCanvasImageColors } from "./image-color";
import {
  createQuireImageTransformMatrix,
  type QuireImageCommand
} from "../core/display-list";
import type { Canvas2DRenderTarget } from "./types";

/**
 * Paints one image through an optional center-fixed destination transform.
 *
 * @param target - Canvas target receiving the image.
 * @param command - Resolved image command with optional source crop and transform.
 */
export function paintCanvasImageCommand(
  target: Canvas2DRenderTarget,
  command: QuireImageCommand
): void {
  if (!command.source) {
    return;
  }

  command = { ...command, source: resolveCanvasImageColors(command)! };
  const matrix = createQuireImageTransformMatrix(
    command.rect,
    command.transform
  );
  if (matrix === null) {
    paintCanvasImageSource(target, command);
    return;
  }
  if (
    target.save === undefined
    || target.restore === undefined
    || target.transform === undefined
  ) {
    throw new Error(
      "Canvas target must support save, restore, and transform for transformed images."
    );
  }

  target.save();
  try {
    target.transform(
      matrix.a,
      matrix.b,
      matrix.c,
      matrix.d,
      matrix.e,
      matrix.f
    );
    paintCanvasImageSource(target, command);
  } finally {
    target.restore();
  }
}

/**
 * Paints one complete or cropped image into its untransformed destination.
 *
 * @param target - Canvas target whose current transform is already established.
 * @param command - Resolved image command.
 */
function paintCanvasImageSource(
  target: Canvas2DRenderTarget,
  command: QuireImageCommand
): void {
  if (!command.source) {
    return;
  }
  if (command.sourceRect !== undefined) {
    target.drawImage?.(
      command.source,
      command.sourceRect.x,
      command.sourceRect.y,
      command.sourceRect.width,
      command.sourceRect.height,
      command.rect.x,
      command.rect.y,
      command.rect.width,
      command.rect.height
    );
    return;
  }

  target.drawImage?.(
    command.source,
    command.rect.x,
    command.rect.y,
    command.rect.width,
    command.rect.height
  );
}
