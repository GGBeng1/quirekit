import { isTextScale, readTextScale } from "./text-scale/value";
/** Word-compatible emphasis-mark value space. */
export type TextStyleEmphasisMark =
  | "none"
  | "dot"
  | "comma"
  | "circle"
  | "underDot";

/** Attributes stored on the `textStyle` mark. */
export interface TextStyleAttributes extends Record<string, unknown> {
  /** Explicit character-grid participation; null restores inherited formatting. */
  readonly characterGrid?: boolean | null | undefined;
  /** CSS `font-family` value applied to text. */
  readonly fontFamily?: string | null | undefined;
  /** Direct Latin and high-ANSI family used by script-aware layout. */
  readonly fontFamilyLatin?: string | null | undefined;
  /** Direct East Asian family used by script-aware layout. */
  readonly fontFamilyEastAsia?: string | null | undefined;
  /** Direct complex-script family retained for compatible shaping and export. */
  readonly fontFamilyComplexScript?: string | null | undefined;
  /** CSS `color` value applied to text. */
  readonly color?: string | null | undefined;
  /** CSS `background-color` value applied to text. */
  readonly backgroundColor?: string | null | undefined;
  /** CSS `font-size` value applied to text. */
  readonly fontSize?: string | null | undefined;
  /** Direct complex-script font size retained independently from Latin size. */
  readonly fontSizeComplexScript?: string | null | undefined;
  /** CSS `letter-spacing` value applied to text. */
  readonly letterSpacing?: string | null | undefined;
  /** Width-only scale in integer percent (1–600); null resumes inheritance. */
  readonly textScale?: number | null | undefined;
  /** Explicit ordinary bold override; canonical authoring stores false only. */
  readonly bold?: boolean | null | undefined;
  /** Explicit ordinary italic override; canonical authoring stores false only. */
  readonly italic?: boolean | null | undefined;
  /** Whether Word-compatible all-capitals rendering is active. */
  readonly allCaps?: boolean | null | undefined;
  /** Whether Word-compatible small-capitals rendering is active. */
  readonly smallCaps?: boolean | null | undefined;
  /** Direct complex-script-only bold state, including explicit false. */
  readonly boldCs?: boolean | null | undefined;
  /** Direct complex-script-only italic state, including explicit false. */
  readonly italicCs?: boolean | null | undefined;
  /** Explicit Word-compatible run direction, including explicit false. */
  readonly rightToLeft?: boolean | null | undefined;
  /** Direct hidden-text state, including explicit false. */
  readonly hidden?: boolean | null | undefined;
  /** Direct legacy outline effect, including explicit false. */
  readonly outline?: boolean | null | undefined;
  /** Direct legacy shadow effect, including explicit false. */
  readonly shadow?: boolean | null | undefined;
  /** Direct legacy emboss effect, including explicit false. */
  readonly emboss?: boolean | null | undefined;
  /** Direct legacy imprint effect, including explicit false. */
  readonly imprint?: boolean | null | undefined;
  /** Direct East-Asian emphasis mark, including explicit `none`. */
  readonly emphasisMark?: TextStyleEmphasisMark | null | undefined;
  /** BCP 47 language for Latin and other non-East-Asian text. */
  readonly languageLatin?: string | null | undefined;
  /** BCP 47 language for East Asian text. */
  readonly languageEastAsia?: string | null | undefined;
  /** BCP 47 language for complex-script text. */
  readonly languageComplexScript?: string | null | undefined;
}

/** CSS style property names backed by textStyle attrs. */
const styleAttributeEntries = [
  ["fontFamily", "font-family"],
  ["color", "color"],
  ["backgroundColor", "background-color"],
  ["fontSize", "font-size"],
  ["letterSpacing", "letter-spacing"]
] as const;

/** Script-aware family attributes retained as Quire-owned HTML data. */
const scriptFontAttributeEntries = [
  ["fontFamilyLatin", "data-qk-font-family-latin"],
  ["fontFamilyEastAsia", "data-qk-font-family-east-asia"],
  ["fontFamilyComplexScript", "data-qk-font-family-complex-script"],
  ["fontSizeComplexScript", "data-qk-font-size-complex-script"]
] as const;

/** Complex-script emphasis retained as Quire-owned HTML data. */
const complexScriptEmphasisEntries = [
  ["boldCs", "data-qk-bold-complex-script"],
  ["italicCs", "data-qk-italic-complex-script"]
] as const;

/** Ordinary emphasis overrides retained as exact Quire-owned HTML data. */
const directEmphasisEntries = [
  ["bold", "data-qk-direct-bold", "font-weight", "bold", "normal"],
  ["italic", "data-qk-direct-italic", "font-style", "italic", "normal"]
] as const;

/** Exact boolean Word run properties retained as Quire-owned HTML data. */
const booleanRunAttributeEntries = [
  ["characterGrid", "data-qk-character-grid"],
  ["hidden", "data-qk-hidden-text"],
  ["outline", "data-qk-text-outline"],
  ["shadow", "data-qk-text-shadow"],
  ["emboss", "data-qk-text-emboss"],
  ["imprint", "data-qk-text-imprint"]
] as const;

/** Word-compatible script language slots retained as Quire-owned HTML data. */
const scriptLanguageAttributeEntries = [
  ["languageLatin", "data-qk-language-latin"],
  ["languageEastAsia", "data-qk-language-east-asia"],
  ["languageComplexScript", "data-qk-language-complex-script"]
] as const;

/** Boolean Word run properties projected to interoperable CSS declarations. */
const caseStyleEntries = [
  ["allCaps", "text-transform", "uppercase"],
  ["smallCaps", "font-variant-caps", "small-caps"]
] as const;

/**
 * Parses supported text style attributes from an HTML element.
 *
 * @param element - Element whose inline style should be inspected.
 * @returns Text style attributes parsed from inline CSS.
 */
export function parseTextStyleAttributes(element: HTMLElement): TextStyleAttributes {
  return {
    fontFamily: normalizeStyleValue(element.style.fontFamily),
    fontFamilyLatin: normalizeNullableValue(
      element.getAttribute("data-qk-font-family-latin")
    ),
    fontFamilyEastAsia: normalizeNullableValue(
      element.getAttribute("data-qk-font-family-east-asia")
    ),
    fontFamilyComplexScript: normalizeNullableValue(
      element.getAttribute("data-qk-font-family-complex-script")
    ),
    color: parseLastStyleDeclaration(element, "color") ?? normalizeStyleValue(element.style.color),
    backgroundColor:
      parseLastStyleDeclaration(element, "background-color") ??
      normalizeStyleValue(element.style.backgroundColor),
    fontSize: normalizeStyleValue(element.style.fontSize),
    fontSizeComplexScript: normalizeNullableValue(
      element.getAttribute("data-qk-font-size-complex-script")
    ),
    letterSpacing: normalizeStyleValue(element.style.letterSpacing),
    characterGrid: parseBooleanDataAttribute(element.getAttribute("data-qk-character-grid")),
    textScale: isTextScale(Number(element.getAttribute("data-qk-text-scale")))
      ? Number(element.getAttribute("data-qk-text-scale")) : null,
    bold: parseFalseDataAttribute(element.getAttribute("data-qk-direct-bold")),
    italic: parseFalseDataAttribute(element.getAttribute("data-qk-direct-italic")),
    allCaps: normalizeStyleValue(element.style.textTransform) === "uppercase"
      ? true
      : null,
    smallCaps: normalizeStyleValue(element.style.fontVariantCaps) === "small-caps"
      ? true
      : null,
    boldCs: parseBooleanDataAttribute(
      element.getAttribute("data-qk-bold-complex-script")
    ),
    italicCs: parseBooleanDataAttribute(
      element.getAttribute("data-qk-italic-complex-script")
    ),
    rightToLeft: parseRunRightToLeft(element),
    hidden: parseBooleanDataAttribute(
      element.getAttribute("data-qk-hidden-text")
    ),
    outline: parseBooleanDataAttribute(
      element.getAttribute("data-qk-text-outline")
    ),
    shadow: parseBooleanDataAttribute(
      element.getAttribute("data-qk-text-shadow")
    ),
    emboss: parseBooleanDataAttribute(
      element.getAttribute("data-qk-text-emboss")
    ),
    imprint: parseBooleanDataAttribute(
      element.getAttribute("data-qk-text-imprint")
    ),
    emphasisMark: parseEmphasisMarkDataAttribute(
      element.getAttribute("data-qk-emphasis-mark")
    ),
    languageLatin: normalizeNullableValue(
      element.getAttribute("data-qk-language-latin") ?? element.getAttribute("lang")
    ),
    languageEastAsia: normalizeNullableValue(
      element.getAttribute("data-qk-language-east-asia")
    ),
    languageComplexScript: normalizeNullableValue(
      element.getAttribute("data-qk-language-complex-script")
    )
  };
}

/**
 * Renders supported textStyle attrs into a CSS style attribute.
 *
 * @param attributes - Mark attributes to render.
 * @returns HTML style attributes, or an empty object when no style is set.
 */
export function renderTextStyleAttributes(
  attributes: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  const styles: string[] = [];
  const result: Record<string, unknown> = {};
  const textScale = readTextScale(attributes);
  if (textScale !== undefined) result["data-qk-text-scale"] = String(textScale);

  for (const [attributeName, styleName] of styleAttributeEntries) {
    const value = readStringAttribute(attributes, attributeName);

    if (value !== null) {
      styles.push(`${styleName}: ${value}`);
    }
  }

  if (styles.length > 0) {
    result.style = styles.join("; ");
  }
  for (const [attributeName, htmlName] of scriptFontAttributeEntries) {
    const value = readStringAttribute(attributes, attributeName);
    if (value !== null) {
      result[htmlName] = value;
    }
  }
  for (const [attributeName, htmlName] of complexScriptEmphasisEntries) {
    const value = attributes[attributeName];
    if (typeof value === "boolean") {
      result[htmlName] = String(value);
    }
  }
  for (
    const [attributeName, htmlName, styleName, enabledValue, disabledValue]
    of directEmphasisEntries
  ) {
    const value = attributes[attributeName];
    if (typeof value === "boolean") {
      result[htmlName] = String(value);
      styles.push(`${styleName}: ${value ? enabledValue : disabledValue}`);
    }
  }
  if (typeof attributes.rightToLeft === "boolean") {
    result["data-qk-run-right-to-left"] = String(attributes.rightToLeft);
    if (attributes.rightToLeft) result.dir = "rtl";
  }
  for (const [attributeName, htmlName] of booleanRunAttributeEntries) {
    const value = attributes[attributeName];
    if (typeof value === "boolean") {
      result[htmlName] = String(value);
    }
  }
  if (isTextStyleEmphasisMark(attributes.emphasisMark)) {
    result["data-qk-emphasis-mark"] = attributes.emphasisMark;
  }
  for (const [attributeName, htmlName] of scriptLanguageAttributeEntries) {
    const value = readStringAttribute(attributes, attributeName);
    if (value !== null) {
      result[htmlName] = value;
      if (attributeName === "languageLatin") {
        result.lang = value;
      }
    }
  }
  for (const [attributeName, styleName, styleValue] of caseStyleEntries) {
    if (attributes[attributeName] === true) {
      styles.push(`${styleName}: ${styleValue}`);
    }
  }
  if (styles.length > 0) {
    result.style = styles.join("; ");
  }
  return result;
}

/**
 * Removes schema-only textStyle attrs from a rendered HTML attribute bag.
 *
 * @param attributes - HTML attributes prepared from mark attrs.
 * @returns Attributes without textStyle schema fields.
 */
export function omitTextStyleSchemaAttributes(
  attributes: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  const result = { ...attributes };

  for (const [attributeName] of styleAttributeEntries) {
    delete result[attributeName];
  }
  for (const [attributeName] of scriptFontAttributeEntries) {
    delete result[attributeName];
  }
  for (const [attributeName] of complexScriptEmphasisEntries) {
    delete result[attributeName];
  }
  for (const [attributeName] of directEmphasisEntries) {
    delete result[attributeName];
  }
  delete result.rightToLeft;
  delete result.textScale;
  for (const [attributeName] of booleanRunAttributeEntries) {
    delete result[attributeName];
  }
  delete result.emphasisMark;
  for (const [attributeName] of scriptLanguageAttributeEntries) {
    delete result[attributeName];
  }
  for (const [attributeName] of caseStyleEntries) {
    delete result[attributeName];
  }

  return result;
}

/**
 * Checks whether at least one supported textStyle attr is set.
 *
 * @param attributes - Mark attributes to inspect.
 * @returns Whether the mark carries a rendered text style.
 */
export function hasTextStyleAttributes(
  attributes: Readonly<Record<string, unknown>>
): boolean {
  return Object.values(attributes).some((value) => (
    value !== null
    && value !== undefined
    && (typeof value !== "string" || value.trim().length > 0)
  ));
}

/**
 * Reads a non-empty string attribute.
 *
 * @param attributes - Attribute bag to inspect.
 * @param name - Attribute name to read.
 * @returns Trimmed string value, or null.
 */
function readStringAttribute(
  attributes: Readonly<Record<string, unknown>>,
  name: string
): string | null {
  const value = attributes[name];

  return typeof value === "string" ? normalizeStyleValue(value) : null;
}

/**
 * Normalizes empty CSS style values to null.
 *
 * @param value - Raw CSS style value.
 * @returns Trimmed style value, or null.
 */
function normalizeStyleValue(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Normalizes one optional HTML attribute into a text-style value.
 *
 * @param value - Raw nullable HTML attribute value.
 * @returns Trimmed non-empty value, or null.
 */
function normalizeNullableValue(value: string | null): string | null {
  return value === null ? null : normalizeStyleValue(value);
}

/**
 * Parses one exact boolean data attribute without inferring truthiness.
 *
 * @param value - HTML attribute value.
 * @returns Boolean state or null when absent/invalid.
 */
function parseBooleanDataAttribute(value: string | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

/**
 * Parses one canonical false-only direct-emphasis HTML attribute.
 *
 * Semantic true is represented by the ordinary bold/italic mark. Treating a
 * `true` data value as absent prevents generic HTML from creating a conflicting
 * true mark plus direct override.
 *
 * @param value - Raw Quire-owned data attribute.
 * @returns False when explicitly disabled, otherwise null.
 */
function parseFalseDataAttribute(value: string | null): false | null {
  return value === "false" ? false : null;
}

/**
 * Parses one closed Word emphasis-mark data attribute.
 *
 * @param value - Raw nullable HTML attribute value.
 * @returns Exact emphasis-mark kind or null when absent/invalid.
 */
function parseEmphasisMarkDataAttribute(
  value: string | null
): TextStyleEmphasisMark | null {
  return isTextStyleEmphasisMark(value) ? value : null;
}

/**
 * Checks one unknown value against the closed Word emphasis-mark value space.
 *
 * @param value - Candidate value.
 * @returns Whether the value is a supported emphasis mark.
 */
export function isTextStyleEmphasisMark(
  value: unknown
): value is TextStyleEmphasisMark {
  return value === "none"
    || value === "dot"
    || value === "comma"
    || value === "circle"
    || value === "underDot";
}

/**
 * Parses explicit run direction without conflating false with absence.
 *
 * @param element - Span carrying Quire HTML data or an interoperable `dir` fallback.
 * @returns Explicit run-direction state or null when absent.
 */
function parseRunRightToLeft(element: HTMLElement): boolean | null {
  const explicit = parseBooleanDataAttribute(
    element.getAttribute("data-qk-run-right-to-left")
  );
  if (explicit !== null) return explicit;
  return element.getAttribute("dir")?.trim().toLowerCase() === "rtl" ? true : null;
}

/**
 * Reads the last matching declaration from the raw style attribute.
 *
 * @param element - HTML element whose raw style should be inspected.
 * @param property - Lowercase CSS property name to find.
 * @returns The last matching declaration value, or null.
 */
function parseLastStyleDeclaration(element: HTMLElement, property: string): string | null {
  const rawStyle = element.getAttribute("style");

  if (!rawStyle) {
    return null;
  }

  let result: string | null = null;

  for (const declaration of rawStyle.split(";")) {
    const colonIndex = declaration.indexOf(":");

    if (colonIndex === -1) {
      continue;
    }

    const name = declaration.slice(0, colonIndex).trim().toLowerCase();
    const value = normalizeStyleValue(declaration.slice(colonIndex + 1));

    if (name === property && value !== null) {
      result = value.replaceAll("\"", "").replaceAll("'", "");
    }
  }

  return result;
}
