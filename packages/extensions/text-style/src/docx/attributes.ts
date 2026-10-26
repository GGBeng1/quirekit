/**
 * Copies one non-empty string under a canonical target name.
 *
 * @param source - Source attribute record.
 * @param sourceName - Attribute to read.
 * @param target - Mutable target fragment.
 * @param targetName - Attribute to write.
 */
export function copyString(
  source: Readonly<Record<string, unknown>>,
  sourceName: string,
  target: Record<string, unknown>,
  targetName: string
): void {
  const value = readNonEmptyString(source[sourceName]);
  if (value !== undefined) target[targetName] = value;
}

/**
 * Validates and copies one point-size string.
 *
 * @param source - Source attribute record.
 * @param target - Mutable target fragment.
 * @param path - Structural diagnostic path.
 */
export function copyPointSize(
  source: Readonly<Record<string, unknown>>,
  target: Record<string, unknown>,
  path: string
): void {
  copyNamedPointSize(source, "fontSize", target, path);
}

/**
 * Validates and copies one named point-size string.
 *
 * @param source - Source attribute record.
 * @param name - Canonical point-size attribute.
 * @param target - Mutable target fragment.
 * @param path - Structural diagnostic path.
 */
export function copyNamedPointSize(
  source: Readonly<Record<string, unknown>>,
  name: "fontSize" | "fontSizeComplexScript",
  target: Record<string, unknown>,
  path: string
): void {
  const value = readNonEmptyString(source[name]);
  if (value === undefined) return;
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)pt$/u.test(value)) {
    throw new Error(`Unsupported textStyle ${name} "${value}" at ${path}.`);
  }
  const points = Number.parseFloat(value);
  if (!Number.isFinite(points) || points < 1 || points > 300) {
    throw new Error(`Out-of-range textStyle ${name} "${value}" at ${path}.`);
  }
  target[name] = `${points}pt`;
}

/**
 * Validates and copies one direct sRGB color.
 *
 * @param source - Source attribute record.
 * @param name - Color attribute name.
 * @param target - Mutable target fragment.
 * @param path - Structural diagnostic path.
 */
export function copyHexColor(
  source: Readonly<Record<string, unknown>>,
  name: "color" | "backgroundColor",
  target: Record<string, unknown>,
  path: string
): void {
  const value = readNonEmptyString(source[name]);
  if (value === undefined) return;
  if (!/^#[0-9a-f]{6}$/iu.test(value)) {
    throw new Error(`Unsupported textStyle ${name} "${value}" at ${path}.`);
  }
  target[name] = value.toUpperCase();
}

/**
 * Reads one trimmed non-empty string.
 *
 * @param value - Candidate value.
 * @returns Trimmed string or undefined.
 */
export function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/**
 * Reads one record without accepting arrays.
 *
 * @param value - Candidate record.
 * @returns Record or undefined.
 */
export function readRecord(
  value: unknown
): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}
