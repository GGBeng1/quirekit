import type {
  DocxBorder,
  DocxIndentation,
  DocxParagraphProperties,
  DocxRunProperties,
  DocxShading,
  DocxSpacing,
  DocxStylesApi
} from "./types.js";

/**
 * Creates the semantic style operation family.
 *
 * @returns Immutable style builders.
 */
export function createDocxStylesApi(): DocxStylesApi {
  return Object.freeze({
    shading: createShading,
    border: createBorder,
    spacing: freezeSpacing,
    indentation: freezeIndentation,
    runProperties: freezeRunProperties,
    paragraphProperties: freezeParagraphProperties
  });
}

/**
 * Creates one normalized shading value.
 *
 * @param options - Pattern and color inputs.
 * @returns Immutable shading value.
 */
function createShading(options: {
  readonly fill?: string | undefined;
  readonly color?: string | undefined;
  readonly pattern?: string | undefined;
}): DocxShading {
  return Object.freeze({
    val: options.pattern ?? "clear",
    ...(options.color == null
      ? {}
      : { color: normalizeColor(options.color) }),
    ...(options.fill == null
      ? {}
      : { fill: normalizeColor(options.fill) })
  });
}

/**
 * Creates one normalized border value.
 *
 * @param options - Border style, color, width, and spacing.
 * @returns Immutable border value.
 */
function createBorder(options: {
  readonly style?: string | undefined;
  readonly color?: string | undefined;
  readonly size?: number | undefined;
  readonly space?: number | undefined;
} = {}): DocxBorder {
  return Object.freeze({
    val: options.style ?? "single",
    ...(options.color == null
      ? {}
      : { color: normalizeColor(options.color) }),
    ...(options.size == null ? {} : { sz: options.size }),
    ...(options.space == null ? {} : { space: options.space })
  });
}

/**
 * Freezes paragraph spacing.
 *
 * @param options - Spacing fields.
 * @returns Immutable spacing.
 */
function freezeSpacing(options: DocxSpacing): DocxSpacing {
  return Object.freeze(compactOptionalProperties(options));
}

/**
 * Freezes paragraph indentation.
 *
 * @param options - Indentation fields.
 * @returns Immutable indentation.
 */
function freezeIndentation(options: DocxIndentation): DocxIndentation {
  return Object.freeze(compactOptionalProperties(options));
}

/**
 * Normalizes and freezes run properties.
 *
 * @param options - Run properties.
 * @returns Immutable portable run properties.
 */
function freezeRunProperties(options: DocxRunProperties): DocxRunProperties {
  return Object.freeze({
    ...compactOptionalProperties(options),
    ...(options.fontSize == null
      ? {}
      : { fontSize: asPointToken(options.fontSize) }),
    ...(options.letterSpacing == null
      ? {}
      : { letterSpacing: asPointToken(options.letterSpacing) }),
    ...(options.color == null
      ? {}
      : { color: normalizeColor(options.color) }),
    ...(options.backgroundColor == null
      ? {}
      : { backgroundColor: normalizeColor(options.backgroundColor) })
  });
}

/**
 * Freezes nested paragraph properties.
 *
 * @param options - Paragraph properties.
 * @returns Immutable paragraph properties.
 */
function freezeParagraphProperties(
  options: DocxParagraphProperties
): DocxParagraphProperties {
  return Object.freeze({
    ...compactOptionalProperties(options),
    ...(options.spacing == null
      ? {}
      : { spacing: freezeSpacing(options.spacing) }),
    ...(options.indent == null
      ? {}
      : { indent: freezeIndentation(options.indent) }),
    ...(options.borders == null
      ? {}
      : {
          borders: Object.freeze(Object.fromEntries(
            Object.entries(options.borders).map(([side, border]) => [
              side,
              Object.freeze(compactOptionalProperties(border))
            ])
          ))
        }),
    ...(options.shading == null
      ? {}
      : {
          shading: Object.freeze(
            compactOptionalProperties(options.shading)
          )
        })
  });
}

/**
 * Removes absent schema attributes before semantic values enter LitAST.
 *
 * ProseMirror and Tiptap commonly expose optional attributes as `null` even
 * when a focused TypeScript contract uses `undefined`. Treating both as absent
 * keeps ordinary extension converters free from repetitive cleanup.
 *
 * @param value - Semantic property record supplied by an extension.
 * @returns Shallow copy containing only present property values.
 */
function compactOptionalProperties<T extends object>(
  value: T
): T {
  return Object.fromEntries(
    Object.entries(value as Readonly<Record<string, unknown>>)
      .filter(([, property]) => property != null)
  ) as T;
}

/**
 * Converts a numeric point value into the public point token.
 *
 * @param value - String token or numeric point value.
 * @returns Point token.
 */
function asPointToken(value: string | number): string {
  return typeof value === "number" ? `${value}pt` : value;
}

/**
 * Removes the optional hash prefix from one color token.
 *
 * @param value - RGB, theme, or automatic color token.
 * @returns Normalized token.
 */
export function normalizeColor(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
}
