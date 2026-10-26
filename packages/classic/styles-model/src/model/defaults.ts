import {
  defaultWordHeadingStyleId,
  wordHeadingCanvasFontScales,
  type WordHeadingLevel
} from "@quirekit/classic-paragraph-model";
import type {
  WordNamedParagraphStyle,
  WordParagraphStyleRegistry
} from "./types";

/** Built-in Word body paragraph style identifier. */
export const defaultWordBodyStyleId = "Normal";

/** Built-in Word document-title paragraph style identifier. */
export const defaultWordTitleStyleId = "Title";

/** Built-in Word document-subtitle paragraph style identifier. */
export const defaultWordSubtitleStyleId = "Subtitle";

/** Main authoring heading levels exposed by the standard Classic selector. */
export const defaultWordStyleSelectorHeadingLevels = Object.freeze([
  1, 2, 3, 4, 5, 6
] as const);

/**
 * Creates the built-in Word paragraph style registry.
 *
 * The compact authoring surface uses Normal, Title, Subtitle, and Heading 1–6.
 * Heading 7–9 remain in the canonical registry for OOXML and advanced surfaces.
 *
 * @returns Fresh JSON-safe registry containing QuireKit's built-in styles.
 */
export function createDefaultWordParagraphStyleRegistry():
WordParagraphStyleRegistry {
  const styles: Record<string, WordNamedParagraphStyle> = {
    [defaultWordBodyStyleId]: createStyle({
      id: defaultWordBodyStyleId,
      name: "Normal",
      role: "body",
      default: true,
      quickFormat: true,
      uiPriority: 0,
      text: { documentFontRole: "body" }
    }),
    [defaultWordTitleStyleId]: createStyle({
      id: defaultWordTitleStyleId,
      name: "Title",
      role: "title",
      basedOn: defaultWordBodyStyleId,
      next: defaultWordBodyStyleId,
      quickFormat: true,
      uiPriority: 10,
      text: {
        documentFontRole: "heading",
        fontScale: 2,
        lineHeightScale: 2,
        fontWeight: "normal"
      }
    }),
    [defaultWordSubtitleStyleId]: createStyle({
      id: defaultWordSubtitleStyleId,
      name: "Subtitle",
      role: "subtitle",
      basedOn: defaultWordBodyStyleId,
      next: defaultWordBodyStyleId,
      quickFormat: true,
      uiPriority: 11,
      text: {
        documentFontRole: "body",
        fontScale: 1.25,
        lineHeightScale: 1.25,
        fontStyle: "italic"
      }
    })
  };

  for (const level of rangeHeadingLevels()) {
    const id = defaultWordHeadingStyleId(level);
    styles[id] = createStyle({
      id,
      name: `Heading ${level}`,
      role: "heading",
      headingLevel: level,
      basedOn: defaultWordBodyStyleId,
      next: defaultWordBodyStyleId,
      quickFormat: level <= 6,
      uiPriority: 20 + level,
      // Word's built-in headings stay with the paragraph after them and keep their lines together.
      paragraph: { outlineLevel: level - 1, pagination: { widowControl: null, keepNext: true, keepLines: true, pageBreakBefore: null } },
      text: {
        documentFontRole: "heading",
        documentOutlineLevel: level,
        fontScale: wordHeadingCanvasFontScales[level],
        lineHeightScale: wordHeadingCanvasFontScales[level],
        fontWeight: "bold"
      }
    });
  }

  return {
    textPropertiesVersion: 1,
    defaultParagraphStyleId: defaultWordBodyStyleId,
    paragraphDefaults: {},
    textDefaults: { languageLatin: "en-US", languageEastAsia: "zh-CN", languageComplexScript: "ar-SA" },
    styles
  };
}

/** Optional fields used to create one normalized built-in style. */
interface BuiltinStyleInput {
  /** Stable style identifier. */
  readonly id: string;
  /** Product-visible style name. */
  readonly name: string;
  /** Semantic built-in role. */
  readonly role: WordNamedParagraphStyle["role"];
  /** Heading level, when applicable. */
  readonly headingLevel?: WordHeadingLevel | undefined;
  /** Parent style identifier. */
  readonly basedOn?: string | undefined;
  /** Next paragraph style identifier. */
  readonly next?: string | undefined;
  /** Whether this is the default paragraph style. */
  readonly default?: boolean | undefined;
  /** Whether compact galleries may show the style. */
  readonly quickFormat?: boolean | undefined;
  /** Stable gallery order. */
  readonly uiPriority?: number | undefined;
  /** Renderer-neutral text delta. */
  readonly text: WordNamedParagraphStyle["text"];
  /** Paragraph property delta. */
  readonly paragraph?: WordNamedParagraphStyle["paragraph"] | undefined;
}

/**
 * Creates one complete built-in style from a compact input.
 *
 * @param input - Built-in semantic and presentation fields.
 * @returns Complete immutable-ready style definition.
 */
function createStyle(input: BuiltinStyleInput): WordNamedParagraphStyle {
  return {
    id: input.id,
    name: input.name,
    role: input.role,
    headingLevel: input.headingLevel ?? null,
    basedOn: input.basedOn ?? null,
    next: input.next ?? null,
    link: null,
    default: input.default ?? false,
    quickFormat: input.quickFormat ?? false,
    uiPriority: input.uiPriority ?? null,
    hidden: false,
    semiHidden: false,
    unhideWhenUsed: false,
    locked: false,
    paragraph: input.paragraph ?? {},
    text: input.text,
    preservation: null
  };
}

/**
 * Produces every canonical Word heading level.
 *
 * @returns Heading levels one through nine.
 */
function rangeHeadingLevels(): readonly WordHeadingLevel[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9];
}
