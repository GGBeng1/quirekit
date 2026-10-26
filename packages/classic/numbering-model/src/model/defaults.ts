import {
  createWordParagraphDxaMeasurement,
  type WordParagraphIndentation
} from "@quirekit/classic-paragraph-model";
import type {
  WordAbstractNumbering,
  WordListKind,
  WordNumberingLevel,
  WordNumberingRegistry
} from "../types";

/** Stable built-in abstract definition id for decimal lists. */
export const defaultWordOrderedAbstractNumId = "quirekit-decimal";

/** Stable built-in abstract definition id for bullets. */
export const defaultWordBulletAbstractNumId = "quirekit-bullet";

/** Stable built-in abstract definition id for task lists. */
export const defaultWordTaskAbstractNumId = "quirekit-task";

const levelCount = 9;
const levelIndentStepTwips = 360;
const hangingIndentTwips = 360;
const bulletCycle = ["•", "◦", "▪"] as const;

/**
 * Creates the default registry definitions without sharing mutable records.
 *
 * @returns Registry with built-in definitions and no concrete instances.
 */
export function createDefaultWordNumberingRegistry(): WordNumberingRegistry {
  return {
    abstractNums: {
      [defaultWordOrderedAbstractNumId]: createAbstractDefinition("ordered"),
      [defaultWordBulletAbstractNumId]: createAbstractDefinition("bullet"),
      [defaultWordTaskAbstractNumId]: createAbstractDefinition("task")
    },
    nums: {},
    nextInstanceId: 1
  };
}

/**
 * Resolves the built-in abstract definition id for one product list kind.
 *
 * @param kind - Ordered, bullet, or task list family.
 * @returns Stable built-in abstract numbering id.
 */
export function getDefaultWordAbstractNumId(kind: WordListKind): string {
  if (kind === "ordered") return defaultWordOrderedAbstractNumId;
  if (kind === "bullet") return defaultWordBulletAbstractNumId;
  return defaultWordTaskAbstractNumId;
}

/**
 * Creates all nine levels for one built-in list family.
 *
 * @param kind - Ordered, bullet, or task family.
 * @returns Immutable-shape abstract definition.
 */
function createAbstractDefinition(kind: WordListKind): WordAbstractNumbering {
  const levels: Record<string, WordNumberingLevel> = {};
  for (let level = 0; level < levelCount; level += 1) {
    levels[String(level)] = createLevel(kind, level);
  }
  return {
    id: getDefaultWordAbstractNumId(kind),
    kind,
    levels
  };
}

/**
 * Creates one level using Word-like hanging paragraph geometry.
 *
 * @param kind - Ordered, bullet, or task family.
 * @param level - Zero-based level index.
 * @returns Complete level definition.
 */
function createLevel(kind: WordListKind, level: number): WordNumberingLevel {
  return {
    level,
    format: kind === "ordered" ? "decimal" : "bullet",
    text: createLevelText(kind, level),
    start: 1,
    suffix: "tab",
    justification: "start",
    paragraphIndentation: createLevelIndentation(level)
  };
}

/**
 * Creates the marker template for one built-in level.
 *
 * @param kind - Ordered, bullet, or task family.
 * @param level - Zero-based level index.
 * @returns OOXML-like template or literal glyph.
 */
function createLevelText(kind: WordListKind, level: number): string {
  if (kind === "task") return "☐";
  if (kind === "bullet") return bulletCycle[level % bulletCycle.length] ?? "•";
  return Array.from({ length: level + 1 }, (_value, index) => `%${index + 1}`)
    .join(".") + ".";
}

/**
 * Creates the inherited start and hanging indentation for one list level.
 *
 * @param level - Zero-based level index.
 * @returns Paragraph indentation measured in OOXML twips.
 */
function createLevelIndentation(level: number): WordParagraphIndentation {
  return {
    start: createWordParagraphDxaMeasurement((level + 1) * levelIndentStepTwips),
    end: null,
    firstLine: createWordParagraphDxaMeasurement(-hangingIndentTwips)
  };
}
