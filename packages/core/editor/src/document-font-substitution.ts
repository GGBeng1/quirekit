import type {
  QuireDocumentFontTable,
  QuireDocumentFontTableEntry,
  QuireFontSubstitutionCandidate,
  QuireFontSubstitutionCandidateSource,
  QuireFontSubstitutionRule,
  ResolveQuireFontSubstitutionCandidatesOptions
} from "./types";

/**
 * Known open metric-compatible and product-approved family substitutions.
 *
 * These are logical candidates only. Core never bundles or installs their
 * physical font assets.
 */
export const quireDefaultFontSubstitutionRules:
readonly QuireFontSubstitutionRule[] = Object.freeze([
  createSubstitutionRule("Calibri", "Carlito"),
  ...createAliasRules(
    ["宋体", "SimSun", "NSimSun", "新宋体", "Songti SC"],
    "Noto Serif SC"
  ),
  createSubstitutionRule("方正小标宋简体", "Noto Serif SC"),
  ...createAliasRules(
    ["黑体", "SimHei", "微软雅黑", "Microsoft YaHei", "等线", "DengXian"],
    "Noto Sans SC"
  ),
  ...createAliasRules(
    ["楷体", "KaiTi", "KaiTi_GB2312", "STKaiti"],
    "LXGW WenKai"
  ),
  ...createAliasRules(
    ["仿宋", "FangSong", "FangSong_GB2312", "STFangsong"],
    "Zhuque Fangsong"
  )
]);

/** Normalized tables by source object; document attributes are immutable values. */
const normalizedTables = new WeakMap<object, QuireDocumentFontTable | null>();
/** Candidate lists by normalized table, rule list, and requested family. */
const candidateCache = new WeakMap<object, WeakMap<object, Map<string, readonly QuireFontSubstitutionCandidate[]>>>();
/** Cache key standing for an absent font table. */
const absentTable = {};

/**
 * Creates one immutable logical-family substitution rule.
 *
 * @param requestedFamily - Logical family retained by the document.
 * @param substitute - Open family considered only when the request is unavailable.
 * @returns Frozen substitution rule.
 */
function createSubstitutionRule(
  requestedFamily: string,
  substitute: string
): QuireFontSubstitutionRule {
  return Object.freeze({
    requestedFamily,
    substitutes: Object.freeze([substitute])
  });
}

/**
 * Expands exact Office and platform aliases into deterministic rules.
 *
 * @param aliases - Exact logical names matched case-insensitively.
 * @param substitute - Product-approved open rendering family.
 * @returns Frozen rules in alias order.
 */
function createAliasRules(
  aliases: readonly string[],
  substitute: string
): readonly QuireFontSubstitutionRule[] {
  return Object.freeze(aliases.map((alias) => (
    createSubstitutionRule(alias, substitute)
  )));
}

/**
 * Normalizes an untrusted format-neutral document font table.
 *
 * @param value - Candidate font-table metadata from JSON or a file adapter.
 * @returns Normalized table, or null when no valid entries remain.
 */
export function normalizeQuireDocumentFontTable(
  value: unknown
): QuireDocumentFontTable | null {
  const record = readRecord(value);
  if (record === undefined) return null;
  const cached = normalizedTables.get(record);
  if (cached !== undefined) return cached;
  const table = normalizeFontTableRecord(record);
  normalizedTables.set(record, table);
  if (table !== null) normalizedTables.set(table, table);
  return table;
}

/**
 * Normalizes one font-table record without consulting the cache.
 *
 * @param record - Candidate font-table record.
 * @returns Normalized table, or null when no valid entries remain.
 */
function normalizeFontTableRecord(
  record: Readonly<Record<string, unknown>>
): QuireDocumentFontTable | null {
  if (!Array.isArray(record.fonts)) {
    return null;
  }
  const seen = new Set<string>();
  const fonts: QuireDocumentFontTableEntry[] = [];
  for (const candidate of record.fonts) {
    const entry = normalizeFontTableEntry(candidate);
    const key = normalizeFamilyKey(entry?.family);
    if (entry === null || key === undefined || seen.has(key)) {
      continue;
    }
    seen.add(key);
    fonts.push(entry);
  }
  return fonts.length === 0 ? null : { fonts };
}

/**
 * Resolves exact font families before the renderer enters generic glyph fallback.
 *
 * @param options - Logical family, document alternates, and optional host policy.
 * @returns Deduplicated candidates in Word-compatible precedence order.
 */
export function resolveQuireFontSubstitutionCandidates(
  options: ResolveQuireFontSubstitutionCandidatesOptions
): readonly QuireFontSubstitutionCandidate[] {
  // Layout resolves the same families for every text run, so results are shared per table and rule list.
  const table = normalizeQuireDocumentFontTable(options.fontTable);
  const rules = options.rules ?? quireDefaultFontSubstitutionRules;
  let byRules = candidateCache.get(table ?? absentTable);
  if (byRules === undefined) candidateCache.set(table ?? absentTable, byRules = new WeakMap());
  let byFamily = byRules.get(rules);
  if (byFamily === undefined) byRules.set(rules, byFamily = new Map());
  let candidates = byFamily.get(options.requestedFamily);
  if (candidates === undefined) {
    candidates = Object.freeze(resolveCandidates(options.requestedFamily, table, rules));
    byFamily.set(options.requestedFamily, candidates);
  }
  return candidates;
}

/**
 * Resolves candidates without consulting the cache.
 *
 * @param requested - Logical family requested by the document.
 * @param table - Normalized document font table.
 * @param rules - Host substitution policy.
 * @returns Deduplicated candidates in precedence order.
 */
function resolveCandidates(
  requested: string,
  table: QuireDocumentFontTable | null,
  rules: readonly QuireFontSubstitutionRule[]
): QuireFontSubstitutionCandidate[] {
  const requestedFamily = cleanFamily(requested);
  if (requestedFamily === undefined) {
    return [];
  }
  const requestedKey = normalizeFamilyKey(requestedFamily);
  const entry = table?.fonts.find(
    (font) => normalizeFamilyKey(font.family) === requestedKey
  );
  const rule = rules.find(
    (candidate) => normalizeFamilyKey(candidate.requestedFamily) === requestedKey
  );
  const result: QuireFontSubstitutionCandidate[] = [];
  const seen = new Set<string>();
  appendCandidates(result, seen, [requestedFamily], "requested");
  appendCandidates(result, seen, entry?.alternates ?? [], "document-alternate");
  appendCandidates(result, seen, rule?.substitutes ?? [], "metric-compatible");
  return result;
}

/**
 * Adds non-empty unique families from one substitution authority.
 *
 * @param target - Mutable ordered candidate list.
 * @param seen - Case-insensitive family identities already present.
 * @param families - Candidate family names.
 * @param source - Authority assigned to appended candidates.
 */
function appendCandidates(
  target: QuireFontSubstitutionCandidate[],
  seen: Set<string>,
  families: readonly string[],
  source: QuireFontSubstitutionCandidateSource
): void {
  for (const value of families) {
    const family = cleanFamily(value);
    const key = normalizeFamilyKey(family);
    if (family === undefined || key === undefined || seen.has(key)) {
      continue;
    }
    seen.add(key);
    target.push({ family, source });
  }
}

/**
 * Normalizes one font-table entry and its ordered alternate names.
 *
 * @param value - Candidate entry.
 * @returns Normalized entry, or null when its primary family is absent.
 */
function normalizeFontTableEntry(value: unknown): QuireDocumentFontTableEntry | null {
  const record = readRecord(value);
  const family = cleanFamily(record?.family);
  if (family === undefined) {
    return null;
  }
  const alternates = Array.isArray(record?.alternates)
    ? uniqueFamilies(record.alternates, family)
    : [];
  return {
    family,
    ...(alternates.length === 0 ? {} : { alternates })
  };
}

/**
 * Deduplicates untrusted family values while retaining source order.
 *
 * @param values - Candidate alternate values.
 * @param primary - Primary family excluded from its own alternates.
 * @returns Normalized unique family list.
 */
function uniqueFamilies(values: readonly unknown[], primary: string): readonly string[] {
  const seen = new Set([normalizeFamilyKey(primary)]);
  const result: string[] = [];
  for (const value of values) {
    const family = cleanFamily(value);
    const key = normalizeFamilyKey(family);
    if (family === undefined || key === undefined || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(family);
  }
  return result;
}

/**
 * Trims one family name.
 *
 * @param value - Candidate family.
 * @returns Non-empty family or undefined.
 */
function cleanFamily(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/**
 * Creates a case-insensitive font-family identity.
 *
 * @param value - Candidate family.
 * @returns Normalized key or undefined.
 */
function normalizeFamilyKey(value: string | undefined): string | undefined {
  return value?.toLocaleLowerCase("en-US");
}

/**
 * Reads one non-array record.
 *
 * @param value - Candidate record.
 * @returns Record or undefined.
 */
function readRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}
