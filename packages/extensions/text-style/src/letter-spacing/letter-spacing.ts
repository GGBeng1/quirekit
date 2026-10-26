import {
  configureTextStyleAttributeExtension,
  createTextStyleAttributeExtension,
  type TextStyleAttributeExtensionOptions,
  unsetTextStyleAttributeCommand
} from "../attribute-extension";
import {
  setMark,
  type QuireAnyExtension,
  type CommandSpec
} from "@quirekit/core";

/** Options for the Word-compatible character-spacing extension. */
export type LetterSpacingOptions = TextStyleAttributeExtensionOptions;

/** Number of CSS pixels represented by one typographic point. */
const cssPixelsPerPoint = 96 / 72;

const LetterSpacingAttribute = createTextStyleAttributeExtension({
  name: "letterSpacing",
  setCommandName: "setLetterSpacing",
  unsetCommandName: "unsetLetterSpacing",
  attributeName: "letterSpacing",
  styleName: "letter-spacing",
  ai: {
    name: "letterSpacing",
    description: "Character spacing in points: positive such as \"1pt\" spreads letters apart, negative such as \"-0.5pt\" condenses them.",
    schema: { type: "string", pattern: "^-?[0-9]+(\\.[0-9]+)?pt$", examples: ["1pt"] },
    present: { label: "字符间距", value: value => String(value).replace(/pt$/u, " 磅") }
  }
});

/** Word-compatible character-spacing attribute with strict canonical commands. */
export const LetterSpacing = LetterSpacingAttribute.extend({
  /**
   * Creates validated set and unset commands.
   *
   * @returns Command handlers that keep canonical point-valued spacing.
   */
  addCommands() {
    return {
      setLetterSpacing: setValidatedLetterSpacingCommand(),
      unsetLetterSpacing: unsetTextStyleAttributeCommand("letterSpacing")
    };
  }
});

/**
 * Creates the Word-compatible character-spacing extension.
 *
 * @param options - Optional extension options.
 * @returns Extension that contributes character-spacing commands and schema data.
 */
export function letterSpacingExtension(
  options: Partial<LetterSpacingOptions> = {}
): QuireAnyExtension {
  return configureTextStyleAttributeExtension(LetterSpacing, options);
}

/**
 * Normalizes a point, pixel, or numeric spacing value into canonical points.
 *
 * Numeric command values are interpreted as points. CSS pixels remain accepted
 * for HTML interoperability and are converted with the CSS 96-DPI ratio.
 * Unsupported expressions fail closed instead of entering the document model.
 *
 * @param value - Candidate character-spacing value.
 * @returns Canonical signed point token, or null when unsupported.
 */
export function normalizeLetterSpacing(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? formatPointToken(value) : null;
  }
  if (typeof value !== "string") return null;
  const match = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(pt|px)$/u.exec(value.trim());
  if (match === null) return null;
  const magnitude = Number(match[1]);
  if (!Number.isFinite(magnitude)) return null;
  const points = match[2] === "px" ? magnitude / cssPixelsPerPoint : magnitude;
  return formatPointToken(points);
}

/**
 * Creates a command that validates character spacing before setting textStyle.
 *
 * @returns Command handler for canonical signed point spacing.
 */
function setValidatedLetterSpacingCommand(): CommandSpec {
  return (value) => (context) => {
    const normalized = normalizeLetterSpacing(value);
    return normalized === null
      ? false
      : setMark("textStyle", { letterSpacing: normalized })(context);
  };
}

/**
 * Formats one finite point value deterministically.
 *
 * @param value - Signed point value.
 * @returns Canonical point token rounded to six fractional digits.
 */
function formatPointToken(value: number): string {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return `${Object.is(rounded, -0) ? 0 : rounded}pt`;
}
