import { encodeLitAstPreservation } from "@quirekit/lit-docx-contract";
import { readTextStylePreservation } from "../docx/preservation";

/**
 * @param value - Candidate percentage.
 * @returns Whether it is a supported Word glyph-width percentage. */
export function isTextScale(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 600;
}

/**
 * @param attributes - Current or legacy mark attributes.
 * @returns Direct percentage, including a legacy preserved value. */
export function readTextScale(attributes: Readonly<Record<string, unknown>>): number | undefined {
  const value = attributes.textScale
    ?? readTextStylePreservation(attributes.litAstTextStylePreservation)?.attributes.textScale;
  return isTextScale(value) ? value : undefined;
}

/**
 * Promotes legacy preservation to an editable field without discarding other producer data.
 *
 * @param attributes - Mutable canonical mark attributes.
 *
 * @param value - Percentage or null to resume style inheritance.
 */
export function writeTextScale(attributes: Record<string, unknown>, value: number | null): void {
  attributes.textScale = value;
  const preservation = readTextStylePreservation(attributes.litAstTextStylePreservation);
  if (preservation?.attributes.textScale === undefined) return;
  const retained = { ...preservation.attributes };
  delete retained.textScale;
  attributes.litAstTextStylePreservation = Object.keys(retained).length === 0 ? null
    : encodeLitAstPreservation({ ...preservation, attributes: retained });
}

/**
 * @param source - Source run properties.
 * @param target - Destination run properties.
 * @param path - Diagnostic path. */
export function copyTextScale(source: Readonly<Record<string, unknown>>, target: Record<string, unknown>, path: string): void {
  const value = source.textScale;
  if (value === undefined || value === null) return;
  if (!isTextScale(value)) throw new TypeError(`Unsupported textStyle.textScale at ${path}; expected an integer from 1 to 600.`);
  target.textScale = value;
}
