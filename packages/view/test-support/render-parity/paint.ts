import type { QuireDisplayCommand, QuireDisplayList } from "@quirekit/renderer";
import type { QuireRenderParityGap } from "./types";

/** Paint facts and explicit gaps extracted from one display list. */
export interface QuireRenderParityPaintProjection {
  /** Ordered renderer-neutral command facts. */
  readonly commands: readonly unknown[];
  /** Non-portable paint dependencies rejected by the projection. */
  readonly gaps: readonly QuireRenderParityGap[];
}

/**
 * Projects one display list into backend-independent paint facts.
 *
 * @param displayList - Display list to summarize.
 * @param path - Stable path used by gap diagnostics.
 * @returns Ordered paint facts without producer-local command ids.
 */
export function projectQuireRenderParityPaint(
  displayList: QuireDisplayList,
  path: string
): QuireRenderParityPaintProjection {
  const gaps: QuireRenderParityGap[] = [];
  return {
    commands: displayList.commands.map((command, index) => projectPaintCommand(
      command,
      `${path}.commands[${index}]`,
      gaps
    )),
    gaps
  };
}

/**
 * Projects one display command into the facts read by backend painters.
 *
 * @param command - Display command to project.
 * @param path - Stable command path.
 * @param gaps - Gap collector for non-portable dependencies.
 * @returns Backend-independent command facts.
 */
function projectPaintCommand(
  command: QuireDisplayCommand,
  path: string,
  gaps: QuireRenderParityGap[]
): unknown {
  switch (command.kind) {
    case "fill-rect":
    case "caret":
      return { kind: command.kind, rect: command.rect, fillStyle: command.fillStyle };
    case "text":
      return {
        kind: command.kind,
        rect: command.rect,
        text: command.text,
        origin: command.origin,
        font: command.font,
        fillStyle: command.fillStyle,
        direction: command.direction
      };
    case "glyph-run":
      return {
        kind: command.kind,
        rect: command.rect,
        text: command.text,
        origin: command.origin,
        font: command.font,
        fillStyle: command.fillStyle,
        glyphCoverage: command.glyphCoverage,
        glyphs: command.glyphs,
        direction: command.direction
      };
    case "line":
      return {
        kind: command.kind,
        from: command.from,
        to: command.to,
        strokeStyle: command.strokeStyle,
        lineWidth: command.lineWidth,
        lineDash: command.lineDash,
        lineCap: command.lineCap
      };
    case "path":
      return {
        kind: command.kind,
        rect: command.rect,
        segments: command.segments,
        fillStyle: command.fillStyle,
        strokeStyle: command.strokeStyle,
        lineWidth: command.lineWidth
      };
    case "image":
      if (command.href === undefined && command.source !== undefined) {
        gaps.push({
          code: "non-portable-image-source",
          area: "paint",
          path: `${path}.source`,
          message: "Image paint parity requires a portable href instead of a live source object."
        });
      }
      return {
        kind: command.kind,
        rect: command.rect,
        href: command.href,
        sourceRect: command.sourceRect
      };
    case "clip":
      return {
        kind: command.kind,
        rect: command.rect,
        transform: command.transform,
        visualBounds: command.visualBounds,
        commands: command.commands.map((child, index) => projectPaintCommand(
          child,
          `${path}.commands[${index}]`,
          gaps
        ))
      };
  }
}
