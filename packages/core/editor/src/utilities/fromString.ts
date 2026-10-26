/**
 * Converts string values produced by DOM attributes into primitive values.
 *
 * @param value - Value to convert.
 * @returns Number, boolean, original string, or original non-string value.
 */
export function fromString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  if (/^[+-]?(?:\d*\.)?\d+$/.test(value)) {
    return Number(value);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}
