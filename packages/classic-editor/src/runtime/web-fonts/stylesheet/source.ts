import { normalizeQuireWebFontFamily, parseWebFontCss } from "@quirekit/web-fonts";
import type {
  ClassicEditorStylesheetFontSourceRecord,
  ClassicEditorWebFontSource
} from "../../../types";

/** Maximum retained stylesheet bytes; never store an unbounded remote response. */
export const MAX_STYLESHEET_BYTES = 1024 * 1024;

/**
 * Validates a user-selected network URL without probing or changing browser policy.
 * @param value - Absolute CSS or font resource URL.
 * @returns Normalized credential-free HTTP(S) URL.
 */
export function stylesheetUrl(value: string): URL {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    value.length > 2048
  ) {
    throw new Error("Font URLs must use HTTP(S) without embedded credentials.");
  }
  url.hash = "";
  return url;
}

/**
 * Compiles inert CSS metadata into the existing source and manifest contracts.
 * @param record - Static source snapshot; validated again on restore and enable.
 * @returns Source adapter with no mount-time network work.
 */
export function createClassicStylesheetFontSource(
  record: ClassicEditorStylesheetFontSourceRecord
): ClassicEditorWebFontSource {
  const url = stylesheetUrl(record.url);
  if (
    !record.name.trim() ||
    record.name.length > 100 ||
    !Number.isFinite(record.enabledAt) ||
    new TextEncoder().encode(record.css).length > MAX_STYLESHEET_BYTES
  ) {
    throw new Error("Invalid or oversized font stylesheet snapshot.");
  }
  const css = record.css.replace(/\/\*[\s\S]*?\*\//g, "");
  if (/@import\b/i.test(css))
    throw new Error("Use a stylesheet containing @font-face directly, not @import.");
  const groups = new Map<string, string[]>();
  const blocks = [...css.matchAll(/@font-face\s*\{([^}]*)\}/gi)];
  if (blocks.length === 0 || blocks.length > 1024)
    throw new Error("Expected 1–1024 @font-face declarations.");
  // Group exact CSS families before the shared single-family parser preserves faces and shards.
  for (const [block, body = ""] of blocks) {
    const raw = /(?:^|;)\s*font-family\s*:\s*([^;]+)/i.exec(body)?.[1]?.trim() ?? "";
    const family = raw.replace(/^(['"])(.*)\1$/, "$2").trim();
    if (!family || /[\\{};]/.test(family))
      throw new Error("Unsupported or missing CSS font-family.");
    const key = normalizeQuireWebFontFamily(family);
    const group = groups.get(key) ?? [];
    group.push(block);
    groups.set(key, group);
  }
  const id = `stylesheet:${url.href}`;
  const license = { name: "License not specified; verify with the font owner", url: url.href };
  const manifests = [...groups.entries()].map(([family, group]) => {
    const parsed = parseWebFontCss(group.join("\n"), {
      requestedFamily: family,
      providerLabel: record.name,
      stylesheetUrl: url
    });
    for (const face of parsed.faces) {
      for (const asset of face.assets) {
        for (const source of asset.sources) stylesheetUrl(source.url);
      }
      if (face.assets.length > 1 && face.assets.some((asset) => !asset.unicodeRange)) {
        throw new Error("Multiple shards of the same face require unicode-range.");
      }
    }
    return { ...parsed, providerId: id, version: String(record.enabledAt), license };
  });
  return {
    id,
    kind: "custom",
    descriptorUrl: url.href,
    homepageUrl: url.href,
    label: { "zh-CN": record.name, en: record.name },
    settingFields: [],
    /** @inheritdoc */
    async search({ query, subsets }) {
      // CSS has no language catalog. Never invent script support for filter results.
      if (subsets?.length) return [];
      return manifests
        .filter((entry) =>
          entry.family.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
        )
        .map((entry) => ({
          family: entry.family,
          familyId: entry.family,
          sourceId: id,
          sourceLabel: record.name,
          version: entry.version,
          license
        }));
    },
    /** @inheritdoc */
    async resolveFamily({ family }) {
      const manifest = manifests.find(
        (entry) =>
          normalizeQuireWebFontFamily(entry.family) === normalizeQuireWebFontFamily(family.family)
      );
      if (!manifest) throw new Error(`Unknown stylesheet family "${family.family}".`);
      return manifest;
    }
  };
}
