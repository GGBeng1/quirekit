import type {
  OFDBox,
  OFDColor,
  OFDMatrix,
  OFDPathCommand
} from "../model/types";

/**
 * Formats a finite OFD decimal.
 *
 * @param value - Numeric value.
 * @returns Stable decimal token.
 */
export function formatOFDNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError(`OFD numeric values must be finite: ${value}.`);
  }
  const normalized = Math.abs(value) < 0.0000005 ? 0 : value;
  return Number(normalized.toFixed(6)).toString();
}

/**
 * Formats an OFD rectangle.
 *
 * @param box - Rectangle in millimetres.
 * @returns Space-delimited rectangle.
 */
export function formatOFDBox(box: OFDBox): string {
  return [box.x, box.y, box.width, box.height]
    .map(formatOFDNumber)
    .join(" ");
}

/**
 * Formats an OFD affine matrix.
 *
 * @param matrix - Six-value matrix.
 * @returns Space-delimited matrix.
 */
export function formatOFDMatrix(matrix: OFDMatrix): string {
  return matrix.map(formatOFDNumber).join(" ");
}

/**
 * Formats an OFD device color.
 *
 * @param color - RGB color.
 * @returns Space-delimited byte channels.
 */
export function formatOFDColor(color: OFDColor): string {
  return color.value.join(" ");
}

/**
 * Formats typed path commands as OFD abbreviated data.
 *
 * @param commands - Ordered path operations.
 * @returns OFD abbreviated path program.
 */
export function formatOFDPath(
  commands: readonly OFDPathCommand[]
): string {
  return commands.map((command) => {
    if (command.type === "move") {
      return `M ${pair(command.x, command.y)}`;
    }
    if (command.type === "line") {
      return `L ${pair(command.x, command.y)}`;
    }
    if (command.type === "quadratic") {
      return `Q ${pair(command.controlX, command.controlY)} `
        + pair(command.x, command.y);
    }
    if (command.type === "cubic") {
      return `B ${pair(command.control1X, command.control1Y)} `
        + `${pair(command.control2X, command.control2Y)} `
        + pair(command.x, command.y);
    }
    if (command.type === "arc") {
      return `A ${pair(command.radiusX, command.radiusY)} `
        + `${formatOFDNumber(command.rotation)} `
        + `${command.largeArc ? "1" : "0"} ${command.sweep ? "1" : "0"} `
        + pair(command.x, command.y);
    }
    return "C";
  }).join(" ");
}

/**
 * Formats a coordinate pair.
 *
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @returns Space-delimited pair.
 */
function pair(x: number, y: number): string {
  return `${formatOFDNumber(x)} ${formatOFDNumber(y)}`;
}

/**
 * Encodes XML-disallowed characters with OFD hexadecimal escapes.
 *
 * @param value - Authored Unicode text.
 * @returns XML-valid OFD character data.
 */
export function encodeOFDText(value: string): string {
  let result = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    const allowed = codePoint === 0x09
      || codePoint === 0x0a
      || codePoint === 0x0d
      || (codePoint >= 0x20 && codePoint <= 0xd7ff)
      || (codePoint >= 0xe000 && codePoint <= 0xfffd)
      || (codePoint >= 0x10000 && codePoint <= 0x10ffff);
    result += allowed
      ? character
      : `\\${codePoint.toString(16).padStart(4, "0")}`;
  }
  return result;
}
