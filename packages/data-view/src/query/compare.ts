import type { DataField, DataValue } from "../model/types";

/** Compares Unicode scalar sequences without environment-dependent collation.
 * @param left - First string.
 * @param right - Second string.
 * @returns Negative, zero, or positive ordering.
 */
export function compareDataText(left: string, right: string): number {
  const a = Array.from(left), b = Array.from(right);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const difference = a[i]!.codePointAt(0)! - b[i]!.codePointAt(0)!;
    if (difference) return difference;
  }
  return a.length - b.length;
}

/** Compares validated non-null scalar values.
 * @param field - Value semantics.
 * @param left - First value.
 * @param right - Second value.
 * @returns Three-way comparison.
 */
export function compareDataValue(field: DataField, left: DataValue, right: DataValue): number {
  if (field.type === "datetime") return Date.parse(left as string) - Date.parse(right as string);
  if (field.type === "number") return (left as number) - (right as number);
  if (field.type === "boolean") return Number(left) - Number(right);
  return compareDataText(left as string, right as string);
}
