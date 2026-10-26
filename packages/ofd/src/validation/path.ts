import type { OFDValidationIssue } from "../document/types";
import type {
  OFDGraphicObjectState,
  OFDPathCommand
} from "../model/types";
import { validateOFDColor } from "./color";
import {
  hasFiniteOFDNumbers,
  isOFDPositiveFinite,
  isValidOFDDashPattern
} from "./numbers";

/**
 * Validates one path graphic's geometry, stroke measurements, and paint.
 *
 * @param object - Path graphic object.
 * @param pageIndex - Owning page index.
 * @param objectIndex - Stable object index.
 * @param issues - Mutable issue sink.
 */
export function validateOFDPathGraphic(
  object: Extract<OFDGraphicObjectState, { type: "path" }>,
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[]
): void {
  validateOFDPath(object.options.commands, pageIndex, objectIndex, issues);
  const { dashPattern, lineWidth } = object.options;
  if (lineWidth !== undefined && !isOFDPositiveFinite(lineWidth)) {
    issues.push({
      code: "invalid-number",
      message: `Page ${pageIndex} object ${objectIndex} has an invalid LineWidth.`,
      pageIndex,
      objectIndex
    });
  }
  if (dashPattern !== undefined && !isValidOFDDashPattern(dashPattern)) {
    issues.push({
      code: "invalid-number",
      message: `Page ${pageIndex} object ${objectIndex} has an invalid DashPattern.`,
      pageIndex,
      objectIndex
    });
  }
  validateOFDColor(object.options.fillColor, pageIndex, objectIndex, issues);
  validateOFDColor(object.options.strokeColor, pageIndex, objectIndex, issues);
}

/**
 * Validates typed path structure and all path coordinates.
 *
 * @param commands - Ordered path commands.
 * @param pageIndex - Owning page index.
 * @param objectIndex - Stable object index.
 * @param issues - Mutable issue sink.
 */
export function validateOFDPath(
  commands: readonly OFDPathCommand[],
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[]
): void {
  if (commands.length === 0 || commands[0]?.type !== "move") {
    issues.push({
      code: "invalid-path",
      message: `Page ${pageIndex} object ${objectIndex} path must start with move.`,
      pageIndex,
      objectIndex
    });
  }
  if (commands.some((command) => !hasValidOFDPathCoordinates(command))) {
    issues.push({
      code: "invalid-path",
      message: `Page ${pageIndex} object ${objectIndex} has an invalid path coordinate.`,
      pageIndex,
      objectIndex
    });
  }
}

/**
 * Tests numeric coordinate requirements for one abbreviated path command.
 *
 * @param command - Candidate path command.
 * @returns Whether every required path coordinate is finite and usable.
 */
function hasValidOFDPathCoordinates(command: OFDPathCommand): boolean {
  switch (command.type) {
    case "move":
    case "line":
      return hasFiniteOFDNumbers([command.x, command.y]);
    case "quadratic":
      return hasFiniteOFDNumbers([
        command.controlX,
        command.controlY,
        command.x,
        command.y
      ]);
    case "cubic":
      return hasFiniteOFDNumbers([
        command.control1X,
        command.control1Y,
        command.control2X,
        command.control2Y,
        command.x,
        command.y
      ]);
    case "arc":
      return isOFDPositiveFinite(command.radiusX)
        && isOFDPositiveFinite(command.radiusY)
        && hasFiniteOFDNumbers([command.rotation, command.x, command.y]);
    case "close":
      return true;
  }
}
