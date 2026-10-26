import type { ClassicEditorText } from "../../types";
import type {
  ClassicEditorInsertItemDefinition,
  ClassicEditorInsertQuery
} from "../../types/insert";
import { getClassicEditorInsertTextVariants } from "./localize";

/**
 * Reports whether one definition matches committed bilingual search input.
 *
 * @param definition - Feature-owned Insert item.
 * @param query - Committed query and interface locale.
 * @returns Whether label, description, or aliases contain the query.
 */
export function matchesClassicEditorInsertQuery(
  definition: ClassicEditorInsertItemDefinition,
  query: Pick<ClassicEditorInsertQuery, "locale" | "value">
): boolean {
  const normalizedQuery = normalizeClassicEditorInsertSearchValue(
    query.value,
    query.locale
  );
  return normalizedQuery === ""
    || createSearchHaystack(definition, query.locale).includes(normalizedQuery);
}

/**
 * Orders item definitions by the canonical action order and stable identity.
 *
 * @param left - First definition.
 * @param right - Second definition.
 * @returns Sort comparison value.
 */
export function compareClassicEditorInsertDefinitions(
  left: ClassicEditorInsertItemDefinition,
  right: ClassicEditorInsertItemDefinition
): number {
  return left.action.order - right.action.order || left.id.localeCompare(right.id);
}

/**
 * Bounds recent-use memory to a small, deterministic instance-local list.
 *
 * @param value - Optional configured limit.
 * @returns Integer limit from one through twelve.
 */
export function normalizeClassicEditorInsertRecentLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 6;
  return Math.min(12, Math.max(1, Math.trunc(value)));
}

/**
 * Builds locale-independent search content from labels, descriptions, and aliases.
 *
 * @param definition - Feature-owned Insert item.
 * @param locale - Locale controlling case folding.
 * @returns Normalized searchable content.
 */
function createSearchHaystack(
  definition: ClassicEditorInsertItemDefinition,
  locale: ClassicEditorInsertQuery["locale"]
): string {
  const values: ClassicEditorText[] = [
    definition.action.label,
    ...(definition.description === undefined ? [] : [definition.description]),
    ...(definition.keywords ?? [])
  ];
  return values
    .flatMap(getClassicEditorInsertTextVariants)
    .map((value) => normalizeClassicEditorInsertSearchValue(value, locale))
    .join("\n");
}

/**
 * Normalizes user search input without interpreting IME preedit fragments.
 *
 * @param value - Committed search text.
 * @param locale - Product locale controlling case folding.
 * @returns Trimmed compatibility-normalized search value.
 */
function normalizeClassicEditorInsertSearchValue(
  value: string,
  locale: ClassicEditorInsertQuery["locale"]
): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase(locale);
}
