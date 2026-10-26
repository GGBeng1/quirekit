import { formatInflectedThousandsCardinal } from "../cardinal/slavic";

const units = [
  "πρώτο", "δεύτερο", "τρίτο", "τετάρτο", "πέμπτο", "έκτο", "έβδομο",
  "όγδοο", "ένατο", "δέκατο", "ενδέκατο", "δωδέκατο", "δέκατο τρίτο",
  "δέκατο τέταρτο", "δέκατο πέμπτο", "δέκατο έκτο", "δέκατο έβδομο",
  "δέκατο όγδο", "δέκατο ένατο"
] as const;
const tens = [
  "εικοστό", "τριακοστό", "τεσσερακοστό", "πεντηκοστό", "εξηκοστό",
  "εβδομηκοστό", "ογδοηκοστό", "ενενηκοστό"
] as const;
const hundreds = [
  "εκατοστό", "διακοσιοστό", "τριακοσιοστό", "τετρακοσιοστό",
  "πεντακοσιοστό", "εξακοσιοστό", "επτακοσιοστό", "οκτακοσιοστό",
  "εννιακοσιοστό"
] as const;
const thousandPrefixes = [
  "", "δισ", "τρισ", "τετρακισ", "πεντακισ", "εξακισ", "επτακισ",
  "οκτακισ", "εννιακισ", "δεκακισ", "ενδεκακισ", "δωδεκακισ",
  "δεκατριακισ", "δεκατετρακισ", "δεκαπεντακισ", "δεκαεξακισ",
  "δεκαεπτακισ", "δεκαοκτακισ", "δεκαεννιακισ", "εικοσακισ"
] as const;

/**
 * Formats one Greek ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Greek ordinal text.
 */
export function formatGreekOrdinal(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const result: string[] = [];
  const thousandGroup = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousandGroup > 0) {
    result.push(formatGreekOrdinalThousands(value, thousandGroup));
  }
  const hundredDigit = Math.floor(remainder / 100);
  const underHundred = remainder % 100;
  if (hundredDigit > 0) result.push(hundreds[hundredDigit - 1] ?? "");
  if (underHundred > 0) result.push(...formatGreekOrdinalUnderHundred(
    underHundred
  ));
  return result.filter(Boolean).join(" ");
}

/**
 * Formats the Greek ordinal thousand component.
 *
 * @param completeValue - Complete source counter.
 * @param coefficient - Thousand coefficient from one through 999.
 * @returns Ordinal thousand phrase.
 */
function formatGreekOrdinalThousands(
  completeValue: number,
  coefficient: number
): string {
  if (coefficient <= 20) {
    return `${thousandPrefixes[coefficient - 1] ?? ""}χιλιοστό`;
  }
  const components = coefficient < 100
    ? formatGreekOrdinalUnderHundred(coefficient)
    : cardinalGreekThousandCoefficient(completeValue);
  components.push("χιλιοστό");
  return coefficient % 100 === 0
    ? components.join("")
    : components.join(" ");
}

/**
 * Recovers the cardinal coefficient used by the legacy high-thousands rule.
 *
 * @param value - Complete source counter.
 * @returns Cardinal coefficient components.
 */
function cardinalGreekThousandCoefficient(value: number): string[] {
  const cardinal = formatInflectedThousandsCardinal(value, "el-GR").split(" ");
  const boundary = cardinal.findIndex(
    (word) => word === "χίλια" || word === "χιλιάδες"
  );
  const coefficient = boundary < 0 ? cardinal : cardinal.slice(0, boundary);
  return coefficient[0] === "εκατό"
    ? ["ένα", ...coefficient]
    : coefficient;
}

/**
 * Formats one Greek ordinal below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Ordered ordinal components.
 */
function formatGreekOrdinalUnderHundred(value: number): string[] {
  if (value < 20) return [units[value - 1] ?? ""];
  const unit = value % 10;
  const ten = tens[Math.floor(value / 10) - 2] ?? "";
  return unit === 0 ? [ten] : [ten, units[unit - 1] ?? ""];
}
