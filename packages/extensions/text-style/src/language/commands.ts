import {
  setMark,
  type CommandSpec
} from "@quirekit/core";

/** Canonical text-style language slot names. */
export type TextStyleLanguageAttribute =
  | "languageLatin"
  | "languageEastAsia"
  | "languageComplexScript";

/** Public atomic value for the three independent Word run-language slots. */
export interface RunLanguageSlots {
  /** Language used by Latin-script text. */
  readonly latin: string;
  /** Language used by East Asian text. */
  readonly eastAsia: string;
  /** Language used by complex-script text. */
  readonly complexScript: string;
}

/**
 * Canonicalizes one public Word-compatible run-language value.
 *
 * @param value - Candidate BCP 47 language tag or Word's `x-none` sentinel.
 * @returns Canonical tag, or null when the value is unsupported.
 */
export function normalizeRunLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "x-none") return "x-none";
  try {
    return Intl.getCanonicalLocales(trimmed)[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Creates a validated command for one independent language slot.
 *
 * @param attribute - Canonical language attribute to update.
 * @returns Command accepting one Word-compatible language value.
 */
export function setRunLanguageCommand(
  attribute: TextStyleLanguageAttribute
): CommandSpec {
  return (value) => (context) => {
    const normalized = normalizeRunLanguage(value);
    return normalized === null
      ? false
      : setMark("textStyle", { [attribute]: normalized })(context);
  };
}

/**
 * Creates the atomic convenience command that sets every language slot.
 *
 * @returns Command accepting one Word-compatible language value.
 */
export function setAllRunLanguagesCommand(): CommandSpec {
  return (value) => (context) => {
    const normalized = normalizeRunLanguage(value);
    return normalized === null
      ? false
      : setMark("textStyle", {
          languageLatin: normalized,
          languageEastAsia: normalized,
          languageComplexScript: normalized
        })(context);
  };
}

/**
 * Creates the atomic command that sets three independent language slots.
 *
 * @returns Command accepting one complete Word-compatible language tuple.
 */
export function setRunLanguageSlotsCommand(): CommandSpec {
  return (value) => (context) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return false;
    }
    const slots = value as Partial<RunLanguageSlots>;
    const latin = normalizeRunLanguage(slots.latin);
    const eastAsia = normalizeRunLanguage(slots.eastAsia);
    const complexScript = normalizeRunLanguage(slots.complexScript);
    return latin === null || eastAsia === null || complexScript === null
      ? false
      : setMark("textStyle", {
          languageLatin: latin,
          languageEastAsia: eastAsia,
          languageComplexScript: complexScript
        })(context);
  };
}
