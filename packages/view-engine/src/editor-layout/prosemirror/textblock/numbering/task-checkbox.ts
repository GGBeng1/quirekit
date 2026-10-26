import type {
  QuireDisplayCommand,
  QuireRect
} from "@quirekit/renderer";
import { createQuireRoundedRectPathSegments } from "@quirekit/renderer";
import type { CreateWordNumberingMarkerProductsOptions } from "./types";

const taskCheckboxCornerRadius = 2;
const taskCheckboxSize = 14;

/**
 * Creates backend-neutral WPS-like checkbox geometry for a task marker.
 *
 * @param options - Marker fragment and checked state.
 * @param contributionRect - Bounds that must contain every paint command.
 * @returns Border, background, and optional checkmark commands.
 */
export function createTaskCheckboxCommands(
  options: CreateWordNumberingMarkerProductsOptions,
  contributionRect: QuireRect
): readonly QuireDisplayCommand[] {
  const size = taskCheckboxSize;
  const rect = {
    x: options.fragment.rect.x,
    y: contributionRect.y + (contributionRect.height - size) / 2,
    width: size,
    height: size
  };
  const checked = options.marker.checked === true;
  const segments = createQuireRoundedRectPathSegments(rect, taskCheckboxCornerRadius);
  const commands: QuireDisplayCommand[] = [{
    id: `${options.id}:task-checkbox-background`,
    kind: "path",
    range: options.range,
    rect,
    segments,
    fillStyle: checked ? "#3978f6" : "#ffffff"
  }, {
    id: `${options.id}:task-checkbox-border`,
    kind: "path",
    range: options.range,
    rect,
    segments,
    strokeStyle: checked ? "#3978f6" : "#8a929f",
    lineWidth: 1.25
  }];
  if (checked) commands.push(createCheckmarkCommand(options, rect, size));
  return commands;
}

/**
 * Creates the checked-state path inside one task checkbox.
 *
 * @param options - Marker identity and source range.
 * @param rect - Final checkbox bounds.
 * @param size - Final checkbox side length.
 * @returns White checkmark paint command.
 */
function createCheckmarkCommand(
  options: CreateWordNumberingMarkerProductsOptions,
  rect: QuireRect,
  size: number
): QuireDisplayCommand {
  return {
    id: `${options.id}:task-checkbox-check`,
    kind: "path",
    range: options.range,
    rect,
    segments: [
      {
        kind: "move-to",
        point: { x: rect.x + size * 0.22, y: rect.y + size * 0.53 }
      },
      {
        kind: "line-to",
        point: { x: rect.x + size * 0.43, y: rect.y + size * 0.73 }
      },
      {
        kind: "line-to",
        point: { x: rect.x + size * 0.8, y: rect.y + size * 0.28 }
      }
    ],
    strokeStyle: "#ffffff",
    lineWidth: 2
  };
}
