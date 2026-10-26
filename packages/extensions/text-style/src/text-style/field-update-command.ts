import { isTextScale, writeTextScale } from "../text-scale/value";
import {
  setQuireTransactionOrigin,
  type CommandSpec
} from "@quirekit/core";
import { hasTextStyleAttributes } from "../style-attributes";
import type {
  TextStyleField,
  TextStyleFieldValue,
  TextStyleResolvedFieldUpdate
} from "./types";

/**
 * Creates the caller-neutral command for exact collective TextStyle updates.
 *
 * @returns Command that applies every field to one exact range atomically.
 */
export function createApplyTextStyleFieldUpdatesCommand(): CommandSpec {
  return (value) => (context) => {
    if (!isTextStyleResolvedFieldUpdateList(value)) return false;
    const first = value[0]!;
    const markType = context.state.schema.marks.textStyle;
    if (markType === undefined
      || context.state.doc.textBetween(first.from, first.to, "\n", "\n")
        !== first.expectedText) return false;
    const updates = new Map(value.map(item => [item.field, item.value]));
    let changed = false;

    // Apply the complete field tuple before the one root transaction dispatches.
    context.tr.doc.nodesBetween(first.from, first.to, (node, position) => {
      if (!node.isText) return;
      const from = Math.max(first.from, position);
      const to = Math.min(first.to, position + node.nodeSize);
      if (from >= to) return;
      const current = node.marks.find(mark => mark.type === markType);
      const attributes = { ...(current?.attrs ?? {}) };
      for (const [field, update] of updates) {
        applyFieldValue(attributes, field, update);
      }
      context.tr.removeMark(from, to, markType);
      if (hasTextStyleAttributes(attributes)) {
        context.tr.addMark(from, to, markType.create(attributes));
      }
      changed = true;
    });
    if (!changed || context.tr.steps.length === 0) return false;
    setQuireTransactionOrigin(context.tr, "direct");
    context.dispatch?.(context.tr);
    return true;
  };
}

/**
 * Validates one collective caller-neutral TextStyle command payload.
 *
 * @param value - Candidate resolved updates.
 * @returns Whether every update targets the same valid exact range.
 */
function isTextStyleResolvedFieldUpdateList(
  value: unknown
): value is readonly TextStyleResolvedFieldUpdate[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0] as Partial<TextStyleResolvedFieldUpdate>;
  if (!Number.isInteger(first.from)
    || !Number.isInteger(first.to)
    || (first.from ?? 0) < 0
    || (first.to ?? 0) <= (first.from ?? 0)
    || typeof first.expectedText !== "string"
    || typeof first.id !== "string") return false;
  const fields = new Set<TextStyleField>();
  return value.every((item: unknown) => {
    if (item === null || typeof item !== "object") return false;
    const candidate = item as Partial<TextStyleResolvedFieldUpdate>;
    if (candidate.from !== first.from
      || candidate.to !== first.to
      || candidate.expectedText !== first.expectedText
      || candidate.id !== first.id
      || !isTextStyleField(candidate.field)
      || fields.has(candidate.field)
      || (candidate.field === "characterGrid" && candidate.value !== null && typeof candidate.value !== "boolean")
      || !(candidate.field === "textScale" ? candidate.value === null || isTextScale(candidate.value) : isTextStyleFieldValue(candidate.value))) return false;
    fields.add(candidate.field);
    return true;
  });
}

/**
 * Checks the caller-neutral TextStyle field vocabulary.
 *
 * @param value - Candidate field name.
 * @returns Whether the value names one supported field.
 */
function isTextStyleField(value: unknown): value is TextStyleField {
  return typeof value === "string" && textStyleFields.has(value as TextStyleField);
}

/**
 * Checks the broad canonical storage value family.
 *
 * Feature commands perform their narrower normalization before constructing
 * this resolved command input.
 *
 * @param value - Candidate canonical field value.
 * @returns Whether the value can be stored by a TextStyle field.
 */
function isTextStyleFieldValue(value: unknown): value is TextStyleFieldValue {
  return value === null || typeof value === "boolean" || typeof value === "string";
}

/**
 * Applies one canonical field value to a mutable mark attribute snapshot.
 *
 * @param attributes - Mutable mark attributes.
 * @param field - TextStyle-owned field.
 * @param value - Canonical requested value.
 */
function applyFieldValue(
  attributes: Record<string, unknown>,
  field: TextStyleField,
  value: TextStyleFieldValue
): void {
  if (field === "textScale") writeTextScale(attributes, value as number | null);
  else attributes[field] = value;
}

const textStyleFields = new Set<TextStyleField>([
  "characterGrid",
  "bold", "fontFamily", "fontFamilyLatin", "fontFamilyEastAsia",
  "fontFamilyComplexScript", "fontSize", "fontSizeComplexScript", "color",
  "backgroundColor", "letterSpacing", "textScale", "allCaps", "smallCaps", "boldCs",
  "italicCs", "rightToLeft", "hidden", "outline", "shadow", "emboss",
  "imprint", "emphasisMark", "languageLatin", "languageEastAsia",
  "languageComplexScript"
]);
