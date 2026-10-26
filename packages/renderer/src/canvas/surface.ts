import { withCanvasTextScale } from "./text-scale";
import type {
  QuireClipCommand,
  QuirePathSegment,
  QuireTextPaintCommand
} from "../core/display-list";
import type { QuireDrawSurface } from "../core";
import { paintCanvasImageCommand } from "./image";
import type {
  Canvas2DDrawSurfaceOptions,
  Canvas2DRenderTarget
} from "./types";

/**
 * Creates a draw surface backed by a Canvas 2D-like target.
 *
 * @param target - Canvas 2D-like target to adapt.
 * @param options - Optional draw surface hooks.
 * @returns Draw surface that paints through the target.
 */
export function createCanvas2DDrawSurface(
  target: Canvas2DRenderTarget,
  options: Canvas2DDrawSurfaceOptions = {}
): QuireDrawSurface {
  return {
    fillRect(command): void {
      withCommandOpacity(target, command.opacity, () => {
        target.fillStyle = command.fillStyle;
        target.fillRect(command.rect.x, command.rect.y, command.rect.width, command.rect.height);
      });
    },
    fillText(source): void {
      withCanvasTextScale(target, source, (command) => {
        withCommandOpacity(target, command.opacity, () => {
          target.font = command.font;
          target.letterSpacing = `${command.letterSpacing ?? 0}px`;
          paintNativeTextCommand(target, command);
        });
      });
    },
    fillGlyphRun(source): void {
      withCanvasTextScale(target, source, (command) => {
        withCommandOpacity(target, command.opacity, () => {
          target.letterSpacing = `${command.letterSpacing ?? 0}px`;
          if (options.glyphRunPainter?.paintGlyphRun(
            command,
            {
              target,
              ...(options.onGlyphRunFallback === undefined
                ? {}
                : { reportGlyphRunFallback: options.onGlyphRunFallback })
            }
          )) {
            return;
          }

          target.font = command.font;
          paintNativeTextCommand(target, command);
        });
      });
    },
    strokeLine(command): void {
      withCommandOpacity(target, command.opacity, () => {
        setStrokeState(
          target,
          command.strokeStyle,
          command.lineWidth,
          command.lineDash,
          command.lineCap
        );
        target.beginPath?.();
        target.moveTo?.(command.from.x, command.from.y);
        target.lineTo?.(command.to.x, command.to.y);
        target.stroke?.();
      });
    },
    drawPath(command): void {
      withCommandOpacity(target, command.opacity, () => {
        target.beginPath?.();

        for (const segment of command.segments) {
          applyPathSegment(target, segment);
        }

        if (command.fillStyle !== undefined) {
          target.fillStyle = command.fillStyle;
          target.fill?.();
        }

        if (command.strokeStyle !== undefined) {
          setStrokeState(
            target,
            command.strokeStyle,
            command.lineWidth ?? 1,
            command.lineDash
          );
          target.stroke?.();
        }
      });
    },
    drawImage(command): void {
      withCommandOpacity(target, command.opacity, () => {
        paintCanvasImageCommand(target, command);
      });
    },
    withClip(command: QuireClipCommand, draw: () => void): void {
      withCommandOpacity(target, command.opacity, () => {
        assertCanvasClipTransformSupport(target, command);
        target.save?.();
        if (command.transform !== undefined) {
          target.transform?.(
            command.transform.a,
            command.transform.b,
            command.transform.c,
            command.transform.d,
            command.transform.e,
            command.transform.f
          );
        }
        target.beginPath?.();
        target.rect?.(command.rect.x, command.rect.y, command.rect.width, command.rect.height);
        target.clip?.();
        // restore() must run even if draw() throws, or the clip leaks into the
        // next frame's clearRect and corrupts subsequent painting.
        try {
          draw();
        } finally {
          target.restore?.();
        }
      });
    }
  };
}

/**
 * Paints one text-like command through the native Canvas text APIs.
 *
 * Stroke commands fail closed on deliberately minimal targets that omit
 * `strokeText`; browser Canvas contexts implement the route. Silently filling
 * an outline-only face would misrepresent the document's effective formatting.
 *
 * @param target - Canvas target receiving the command.
 * @param command - Text command carrying fill/stroke paint state.
 */
function paintNativeTextCommand(
  target: Canvas2DRenderTarget,
  command: QuireTextPaintCommand
): void {
  const mode = command.paintMode ?? "fill";

  if (mode === "fill" || mode === "fill-stroke") {
    target.fillStyle = command.fillStyle;
    target.fillText(command.text, command.origin.x, command.origin.y);
  }

  if (mode === "stroke" || mode === "fill-stroke") {
    if (target.strokeText === undefined) {
      throw new RangeError("Canvas target must support strokeText for stroked text paint.");
    }
    setStrokeState(
      target,
      command.strokeStyle ?? command.fillStyle,
      command.lineWidth ?? 1
    );
    target.strokeText(command.text, command.origin.x, command.origin.y);
  }
}

/**
 * Rejects transformed clips when a Canvas-like target cannot scope the affine.
 *
 * A partial transform would leak into later page paint or rotate children
 * without their owning clip. Failing before `save()` preserves frame integrity.
 *
 * @param target - Canvas-like target receiving the clip command.
 * @param command - Clip command that may carry an affine transform.
 */
function assertCanvasClipTransformSupport(
  target: Canvas2DRenderTarget,
  command: QuireClipCommand
): void {
  if (
    command.transform !== undefined
    && (
      target.save === undefined
      || target.restore === undefined
      || target.transform === undefined
    )
  ) {
    throw new RangeError(
      "Canvas target must support save, restore, and transform for transformed clips."
    );
  }
}

/**
 * Applies one command's transient opacity without leaking alpha to later paint.
 *
 * Nested clip and child-command opacity multiplies naturally because each call
 * reads the current target alpha before applying its own command multiplier.
 *
 * @param target - Canvas 2D-like target receiving the command.
 * @param opacity - Optional command opacity multiplier.
 * @param draw - Paint operation executed under the resolved alpha.
 */
function withCommandOpacity(
  target: Canvas2DRenderTarget,
  opacity: number | undefined,
  draw: () => void
): void {
  if (opacity === undefined || opacity === 1) {
    draw();
    return;
  }

  const previousAlpha = target.globalAlpha ?? 1;
  target.globalAlpha = previousAlpha * Math.min(1, Math.max(0, opacity));
  try {
    draw();
  } finally {
    target.globalAlpha = previousAlpha;
  }
}

/**
 * Assigns stroke style and line width on a Canvas 2D-like target.
 *
 * @param target - Canvas 2D-like target to mutate.
 * @param strokeStyle - Stroke style to assign.
 * @param lineWidth - Line width to assign.
 * @param lineDash - Optional dash pattern to assign.
 * @param lineCap - Optional line cap style to assign.
 */
function setStrokeState(
  target: Canvas2DRenderTarget,
  strokeStyle: string,
  lineWidth: number,
  lineDash: readonly number[] | undefined = undefined,
  lineCap: CanvasLineCap | undefined = undefined
): void {
  target.strokeStyle = strokeStyle;
  target.lineWidth = lineWidth;
  target.setLineDash?.(lineDash ?? []);
  target.lineCap = lineCap ?? "butt";
}

/**
 * Applies one path segment to a Canvas 2D-like target.
 *
 * @param target - Canvas 2D-like target to mutate.
 * @param segment - Path segment to apply.
 */
function applyPathSegment(
  target: Canvas2DRenderTarget,
  segment: QuirePathSegment
): void {
  switch (segment.kind) {
    case "move-to":
      target.moveTo?.(segment.point.x, segment.point.y);
      break;
    case "line-to":
      target.lineTo?.(segment.point.x, segment.point.y);
      break;
    case "quadratic-curve-to":
      target.quadraticCurveTo?.(
        segment.control.x,
        segment.control.y,
        segment.point.x,
        segment.point.y
      );
      break;
    case "bezier-curve-to":
      target.bezierCurveTo?.(
        segment.control1.x,
        segment.control1.y,
        segment.control2.x,
        segment.control2.y,
        segment.point.x,
        segment.point.y
      );
      break;
    case "close-path":
      target.closePath?.();
      break;
  }
}
