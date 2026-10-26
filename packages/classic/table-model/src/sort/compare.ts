import type { WordSortValue } from "./types";

const latin = new Intl.Collator("en", { sensitivity: "base", numeric: false });
const han = new Intl.Collator("zh-CN", { sensitivity: "base" });
const hanCharacter = /\p{Script=Han}/u;

/**
 * Compares two key values as Word sorts them, ascending.
 *
 * A missing value sorts first. Text compares character by character, ignoring
 * case and accents: at the first difference two Chinese characters compare
 * by pinyin, a Chinese character sorts after any other character, and other
 * characters follow the Latin collation (punctuation, then digits, then letters).
 *
 * @param left - First value.
 * @param right - Second value.
 * @returns Negative, zero or positive.
 */
export function compareWordSortValues(left: WordSortValue, right: WordSortValue): number {
  if (left === null || right === null) return left === right ? 0 : left === null ? -1 : 1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return compareWordSortText(String(left), String(right));
}

/**
 * @param left - First text.
 * @param right - Second text.
 * @returns Negative, zero or positive.
 */
function compareWordSortText(left: string, right: string): number {
  const a = [...left];
  const b = [...right];
  let index = 0;
  while (index < a.length && index < b.length && latin.compare(a[index]!, b[index]!) === 0) index += 1;
  if (index === a.length || index === b.length) return a.length - b.length;
  const restA = a.slice(index).join("");
  const restB = b.slice(index).join("");
  const hanA = hanCharacter.test(a[index]!);
  const hanB = hanCharacter.test(b[index]!);
  if (hanA !== hanB) return hanA ? 1 : -1;
  return (hanA ? han : latin).compare(restA, restB);
}

/**
 * Orders items by several keys, keeping equal items in their original order in either direction.
 *
 * @param values - Key values per item, most significant key first.
 * @param descending - Per key, whether it sorts descending.
 * @returns Item indices in sorted order.
 */
export function orderWordSortItems(
  values: readonly (readonly WordSortValue[])[],
  descending: readonly boolean[]
): number[] {
  return values.map((_, index) => index).sort((left, right) => {
    for (let key = 0; key < descending.length; key += 1) {
      const compared = compareWordSortValues(values[left]![key] ?? null, values[right]![key] ?? null);
      if (compared !== 0) return descending[key] ? -compared : compared;
    }
    return left - right;
  });
}
