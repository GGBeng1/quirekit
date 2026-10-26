import type {
  ClassicEditorLocale,
  ClassicEditorWebFontFamily
} from "@classic/types";

/** Script presentation used by one provider-neutral catalog row. */
interface ClassicFontScriptPresentation {
  /** Stable presentation identity. */
  readonly id: Exclude<ClassicFontScriptFilterId, "all" | "chinese">;
  /** Provider subset tokens assigned to this script. */
  readonly tokens: readonly string[];
  /** Bundled labels keyed by Classic locale. */
  readonly labels: Readonly<Record<ClassicEditorLocale, string>>;
  /** Representative glyph sample for a loaded face. */
  readonly sample: string;
}

/** Stable script filters understood by the provider-neutral font Hub. */
export type ClassicFontScriptFilterId =
  | "all"
  | "chinese"
  | "simplified-chinese"
  | "traditional-chinese"
  | "cjk"
  | "japanese"
  | "korean"
  | "latin"
  | "vietnamese"
  | "cyrillic"
  | "greek"
  | "arabic"
  | "hebrew"
  | "devanagari"
  | "thai";

/** One localized option rendered by the Hub language filter. */
export interface ClassicFontScriptFilterOption {
  /** Localized script label. */
  readonly label: string;
  /** Stable filter identity. */
  readonly value: Exclude<ClassicFontScriptFilterId, "all">;
}

const SCRIPT_PRESENTATIONS: readonly ClassicFontScriptPresentation[] = [
  createScript("simplified-chinese", ["chinese-simplified", "simplified-chinese", "sc"], "简体中文", "Simplified Chinese", "山河入画 永字八法 Aa 123"),
  createScript("traditional-chinese", ["chinese-traditional", "traditional-chinese", "tc"], "繁体中文", "Traditional Chinese", "風雲際會 永字八法 Aa 123"),
  createScript("cjk", ["cjk"], "中日韩", "CJK", "山河入画 永字八法 Aa 123"),
  createScript("japanese", ["japanese", "jp"], "日文", "Japanese", "美しい文字 書体見本 Aa 123"),
  createScript("korean", ["korean", "kr"], "韩文", "Korean", "아름다운 글꼴 미리보기 Aa 123"),
  createScript("latin", ["latin", "latin-ext"], "拉丁", "Latin", "The quick brown fox · Aa 123"),
  createScript("vietnamese", ["vietnamese"], "越南文", "Vietnamese", "Trăng sáng bên thềm · Aa 123"),
  createScript("cyrillic", ["cyrillic", "cyrillic-ext"], "西里尔", "Cyrillic", "Быстрая лиса · Aa 123"),
  createScript("greek", ["greek", "greek-ext"], "希腊文", "Greek", "Ταχύ καφέ αλεπού · Aa 123"),
  createScript("arabic", ["arabic"], "阿拉伯文", "Arabic", "معاينة الخط العربي ١٢٣"),
  createScript("hebrew", ["hebrew"], "希伯来文", "Hebrew", "תצוגה מקדימה של גופן 123"),
  createScript("devanagari", ["devanagari"], "天城文", "Devanagari", "सुंदर अक्षर नमूना १२३"),
  createScript("thai", ["thai"], "泰文", "Thai", "ตัวอย่างแบบอักษร ๑๒๓")
];

/**
 * Resolves compact human-readable script coverage for one catalog family.
 *
 * @param family - Provider family metadata.
 * @param locale - Active Classic product locale.
 * @returns Up to three script labels plus an overflow count.
 */
export function resolveClassicFontScriptLabels(
  family: ClassicEditorWebFontFamily,
  locale: ClassicEditorLocale
): readonly string[] {
  const matches = matchClassicFontScripts(family);
  if (matches.length === 0) {
    return [locale === "zh-CN" ? "语种未知" : "Unknown scripts"];
  }
  const visible = matches.slice(0, 3).map((entry) => entry.labels[locale]);
  const remaining = matches.length - visible.length;
  return remaining === 0 ? visible : [...visible, `+${remaining}`];
}

/**
 * Creates localized language/script choices from the shared coverage registry.
 *
 * @param locale - Active Classic product locale.
 * @returns Stable script choices excluding the caller-owned all option.
 */
export function resolveClassicFontScriptFilterOptions(
  locale: ClassicEditorLocale
): readonly ClassicFontScriptFilterOption[] {
  return [{
    label: locale === "zh-CN" ? "中文" : "Chinese",
    value: "chinese"
  }, ...SCRIPT_PRESENTATIONS.map((entry) => ({
    label: entry.labels[locale],
    value: entry.id
  }))];
}

/**
 * Resolves provider subset aliases accepted by one Hub language filter.
 *
 * @param filter - Stable selected filter identity.
 * @returns Empty all-languages filter or provider subset aliases.
 */
export function resolveClassicFontScriptFilterSubsets(
  filter: ClassicFontScriptFilterId
): readonly string[] {
  if (filter === "all") return [];
  if (filter === "chinese") {
    return [...new Set(SCRIPT_PRESENTATIONS.slice(0, 3).flatMap((entry) => entry.tokens))];
  }
  return SCRIPT_PRESENTATIONS.find((entry) => entry.id === filter)?.tokens ?? [];
}

/**
 * Validates an untyped select value before it enters catalog state.
 *
 * @param value - Candidate select value.
 * @returns Whether the value is a stable language filter identity.
 */
export function isClassicFontScriptFilterId(
  value: string
): value is ClassicFontScriptFilterId {
  return value === "all"
    || value === "chinese"
    || SCRIPT_PRESENTATIONS.some((entry) => entry.id === value);
}

/**
 * Selects a representative specimen matching one family's declared coverage.
 *
 * @param family - Provider family metadata.
 * @returns Script-appropriate preview text with Latin fallback.
 */
export function resolveClassicFontPreviewText(
  family: ClassicEditorWebFontFamily
): string {
  return matchClassicFontScripts(family)[0]?.sample
    ?? "字体预览 · Font preview · Aa 123";
}

/**
 * Quotes one provider family for safe use as a CSS font-family value.
 *
 * @param family - Exact provider family metadata.
 * @returns Escaped quoted CSS family value.
 */
export function resolveClassicFontPreviewFamily(
  family: ClassicEditorWebFontFamily
): string {
  const escaped = family.family.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
  return `"${escaped}"`;
}

/**
 * Creates one immutable script-presentation definition.
 *
 * @param id - Stable presentation identity.
 * @param tokens - Matching normalized provider subset tokens.
 * @param chineseLabel - Simplified-Chinese UI label.
 * @param englishLabel - English UI label.
 * @param sample - Representative preview text.
 * @returns Immutable presentation definition.
 */
function createScript(
  id: Exclude<ClassicFontScriptFilterId, "all" | "chinese">,
  tokens: readonly string[],
  chineseLabel: string,
  englishLabel: string,
  sample: string
): ClassicFontScriptPresentation {
  return Object.freeze({
    id,
    tokens: Object.freeze(tokens),
    labels: Object.freeze({ "zh-CN": chineseLabel, en: englishLabel }),
    sample
  });
}

/**
 * Matches provider subset tokens to the ordered presentation registry.
 *
 * @param family - Provider family metadata.
 * @returns Ordered matching script definitions.
 */
function matchClassicFontScripts(
  family: ClassicEditorWebFontFamily
): readonly ClassicFontScriptPresentation[] {
  const tokens = new Set((family.subsets ?? []).map((subset) => (
    subset.trim().toLocaleLowerCase("en-US").replaceAll("_", "-")
  )));
  return SCRIPT_PRESENTATIONS.filter((entry) => (
    entry.tokens.some((token) => tokens.has(token))
  ));
}
