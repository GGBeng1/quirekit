import type { OFDDocumentSnapshot } from "../document/state";
import type { OFDValidationIssue } from "../document/types";
import type { OFDColorSpace, OFDDrawParam, OFDDrawParamColor } from "./paint";

const componentCounts = {
  DeviceGray: 1,
  DeviceRGB: 3,
  DeviceCMYK: 4
} as const;

/**
 * Validates registered color-space and drawing-parameter definitions.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param issues - Mutable validation issue sink.
 */
export function validateOFDRegisteredPaintDefinitions(
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  for (const colorSpace of snapshot.colorSpaces) {
    validateColorSpace(colorSpace.options, issues);
  }
  for (const drawParam of snapshot.drawParams) {
    validateDrawParam(snapshot, drawParam, issues);
  }
  validateDrawParamCycles(snapshot, issues);
}

/**
 * Tests whether a drawing parameter belongs to the frozen document.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param drawParam - Candidate drawing-parameter handle.
 * @returns Whether the handle is owned and registered.
 */
export function isOwnedOFDDrawParam(
  snapshot: OFDDocumentSnapshot,
  drawParam: OFDDrawParam
): boolean {
  return drawParam.documentIdentity === snapshot.documentIdentity
    && snapshot.drawParams.includes(drawParam);
}

/**
 * Tests whether a color space belongs to the frozen document.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param colorSpace - Candidate color-space handle.
 * @returns Whether the handle is owned and registered.
 */
export function isOwnedOFDColorSpace(
  snapshot: OFDDocumentSnapshot,
  colorSpace: OFDColorSpace
): boolean {
  return colorSpace.documentIdentity === snapshot.documentIdentity
    && snapshot.colorSpaces.includes(colorSpace);
}

/**
 * Validates one registered color space and every optional palette entry.
 *
 * @param options - Frozen color-space options.
 * @param issues - Mutable validation issue sink.
 */
function validateColorSpace(
  options: OFDDocumentSnapshot["colorSpaces"][number]["options"],
  issues: OFDValidationIssue[]
): void {
  const componentCount = componentCounts[options.type];
  const bits = options.bitsPerComponent ?? 8;
  if (!componentCount) {
    issues.push({ code: "resource-invalid", message: "OFD color space has an invalid type." });
    return;
  }
  if (![1, 2, 4, 8, 16].includes(bits)) {
    issues.push({ code: "invalid-number", message: "OFD color space has invalid BitsPerComponent." });
    return;
  }
  const maximum = 2 ** bits - 1;
  for (const color of options.palette ?? []) {
    if (color.length !== componentCount || color.some((value) =>
      !Number.isInteger(value) || value < 0 || value > maximum
    )) {
      issues.push({
        code: "invalid-color",
        message: "OFD color-space palette has an invalid channel value."
      });
    }
  }
}

/**
 * Validates one registered drawing parameter and its dependent resources.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param drawParam - Registered drawing-parameter handle.
 * @param issues - Mutable validation issue sink.
 */
function validateDrawParam(
  snapshot: OFDDocumentSnapshot,
  drawParam: OFDDrawParam,
  issues: OFDValidationIssue[]
): void {
  const options = drawParam.options;
  if (options.relative && !isOwnedOFDDrawParam(snapshot, options.relative)) {
    issues.push({ code: "foreign-resource", message: "OFD DrawParam references a foreign base parameter." });
  }
  if ((options.lineWidth !== undefined && (!Number.isFinite(options.lineWidth) || options.lineWidth < 0))
    || (options.dashOffset !== undefined && !Number.isFinite(options.dashOffset))
    || (options.miterLimit !== undefined && (!Number.isFinite(options.miterLimit) || options.miterLimit <= 0))
    || (options.dashPattern !== undefined && !isValidDashPattern(options.dashPattern))) {
    issues.push({ code: "invalid-number", message: "OFD DrawParam has invalid stroke measurements." });
  }
  validateDrawParamColor(snapshot, options.fillColor, issues);
  validateDrawParamColor(snapshot, options.strokeColor, issues);
}

/**
 * Validates one reusable drawing-parameter color and its optional palette link.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param color - Optional draw-parameter color.
 * @param issues - Mutable validation issue sink.
 */
function validateDrawParamColor(
  snapshot: OFDDocumentSnapshot,
  color: OFDDrawParamColor | undefined,
  issues: OFDValidationIssue[]
): void {
  if (!color) return;
  if (color.alpha !== undefined && (!Number.isInteger(color.alpha) || color.alpha < 0 || color.alpha > 255)) {
    issues.push({ code: "invalid-color", message: "OFD DrawParam color has invalid alpha." });
  }
  if (color.colorSpace && !isOwnedOFDColorSpace(snapshot, color.colorSpace)) {
    issues.push({ code: "foreign-resource", message: "OFD DrawParam color references a foreign color space." });
    return;
  }
  const colorSpace = color.colorSpace?.options;
  const componentCount = componentCounts[colorSpace?.type ?? "DeviceRGB"];
  const maximum = 2 ** (colorSpace?.bitsPerComponent ?? 8) - 1;
  if (color.value !== undefined && (color.index !== undefined || color.value.length !== componentCount
    || color.value.some((value) => !Number.isInteger(value) || value < 0 || value > maximum))) {
    issues.push({ code: "invalid-color", message: "OFD DrawParam color has invalid channels." });
  }
  if (color.index !== undefined) {
    const palette = colorSpace?.palette;
    if (!Number.isInteger(color.index) || color.index < 0 || !palette || color.index >= palette.length) {
      issues.push({ code: "invalid-color", message: "OFD DrawParam color has invalid palette index." });
    }
  }
}

/**
 * Detects cycles in same-document DrawParam inheritance links.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param issues - Mutable validation issue sink.
 */
function validateDrawParamCycles(snapshot: OFDDocumentSnapshot, issues: OFDValidationIssue[]): void {
  const complete = new Set<OFDDrawParam>();
  for (const drawParam of snapshot.drawParams) {
    const chain = new Set<OFDDrawParam>();
    let current: OFDDrawParam | undefined = drawParam;
    while (current && !complete.has(current)) {
      if (chain.has(current)) {
        issues.push({ code: "resource-invalid", message: "OFD DrawParam inheritance cannot cycle." });
        break;
      }
      chain.add(current);
      current = current.options.relative;
    }
    for (const visited of chain) complete.add(visited);
  }
}

/**
 * Tests a usable alternating dash pattern.
 *
 * @param pattern - Candidate dash values.
 * @returns Whether all values are non-negative and at least one is positive.
 */
function isValidDashPattern(pattern: readonly number[]): boolean {
  return pattern.length > 0 && pattern.every((value) => Number.isFinite(value) && value >= 0)
    && pattern.some((value) => value > 0);
}
