import type { OFDBox, OFDMatrix } from "../model/types";

/**
 * Tests whether a number is finite and strictly positive.
 *
 * @param value - Candidate number.
 * @returns Whether the value is a positive finite number.
 */
export function isOFDPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Tests whether a number is finite and non-negative.
 *
 * @param value - Candidate number.
 * @returns Whether the value is a non-negative finite number.
 */
export function isOFDNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Tests whether a number is a positive integer.
 *
 * @param value - Candidate number.
 * @returns Whether the value is a positive integer.
 */
export function isOFDPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Tests whether every number in one value sequence is finite.
 *
 * @param values - Candidate numeric values.
 * @returns Whether all values are finite.
 */
export function hasFiniteOFDNumbers(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}

/**
 * Tests whether one OFD box has finite coordinates and positive dimensions.
 *
 * @param box - Candidate box.
 * @returns Whether the box is valid.
 */
export function isValidOFDBox(box: OFDBox): boolean {
  return Number.isFinite(box.x)
    && Number.isFinite(box.y)
    && isOFDPositiveFinite(box.width)
    && isOFDPositiveFinite(box.height);
}

/**
 * Tests whether an affine CTM has exactly six finite components.
 *
 * @param matrix - Candidate transformation matrix.
 * @returns Whether the matrix is valid.
 */
export function isValidOFDMatrix(matrix: OFDMatrix): boolean {
  return matrix.length === 6 && hasFiniteOFDNumbers(matrix);
}

/**
 * Tests whether a dash pattern has usable non-negative dash and gap lengths.
 *
 * @param pattern - Candidate dash pattern.
 * @returns Whether the pattern has at least one positive finite component.
 */
export function isValidOFDDashPattern(pattern: readonly number[]): boolean {
  return pattern.length > 0
    && pattern.every(isOFDNonNegativeFinite)
    && pattern.some((value) => value > 0);
}
