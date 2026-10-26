import type {
  QuireFontSourceDescriptor,
  QuireFontSourceFamilySummary,
  QuireFontSourceText,
  QuireRemoteFontSourceClient
} from "@quirekit/web-fonts";
import type {
  ClassicEditorBilingualText,
  ClassicEditorCustomWebFontSourceRecord,
  ClassicEditorWebFontFamily,
  ClassicEditorWebFontSource
} from "../../types";

/**
 * Creates a Classic adapter over one validated declarative remote source.
 *
 * @param record - Persisted descriptor URL and validated descriptor.
 * @param client - Credentials-omitting remote protocol client.
 * @returns Dynamic source adapter recreated without remote executable code.
 */
export function createClassicRemoteWebFontSource(
  record: ClassicEditorCustomWebFontSourceRecord,
  client: QuireRemoteFontSourceClient
): ClassicEditorWebFontSource {
  const descriptor = record.descriptor;
  return {
    id: descriptor.id,
    label: toClassicBilingualText(descriptor.name),
    kind: "custom",
    descriptorUrl: record.descriptorUrl,
    ...(descriptor.homepageUrl === undefined
      ? {}
      : { homepageUrl: descriptor.homepageUrl }),
    settingFields: createSettingFields(descriptor),
    /** @inheritdoc */
    async search({ query, settings, subsets }) {
      return (await client.browse(descriptor, {
        query,
        limit: 100,
        ...(subsets === undefined ? {} : { subsets }),
        settings
      })).items
        .map((family) => toClassicFamily(descriptor, family));
    },
    /** @inheritdoc */
    async browse(request) {
      const page = await client.browse(descriptor, request);
      return {
        items: page.items.map((family) => toClassicFamily(descriptor, family)),
        ...(page.total === undefined ? {} : { total: page.total }),
        ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor })
      };
    },
    /** @inheritdoc */
    async resolveFamily({ family, settings }) {
      const familyId = family.familyId?.trim();
      const version = family.version?.trim();
      if (!familyId || !version) {
        throw new Error(`Remote font family "${family.family}" has no exact identity or version.`);
      }
      return client.resolveFamily(descriptor, { familyId, version, settings });
    }
  };
}

/**
 * Maps one remote summary into provider-neutral Classic metadata.
 *
 * @param descriptor - Validated source descriptor that owns the family.
 * @param family - Validated remote catalog summary.
 * @returns Classic family metadata with source-scoped identity.
 */
function toClassicFamily(
  descriptor: QuireFontSourceDescriptor,
  family: QuireFontSourceFamilySummary
): ClassicEditorWebFontFamily {
  return {
    familyId: family.familyId,
    family: family.family,
    version: family.version,
    ...(family.displayName === undefined ? {} : { displayName: family.displayName }),
    sourceId: descriptor.id,
    sourceLabel: descriptor.name.default,
    license: family.license,
    ...(family.category === undefined ? {} : { category: family.category }),
    ...(family.subsets === undefined ? {} : { subsets: family.subsets }),
    variants: [
      ...(family.weights ?? []),
      ...(family.styles ?? []).filter((style) => style !== "normal")
    ]
  };
}

/**
 * Creates the only supported origin-local remote-source setting field.
 *
 * @param descriptor - Validated source descriptor.
 * @returns Empty or single-field Classic source settings.
 */
function createSettingFields(
  descriptor: QuireFontSourceDescriptor
): ClassicEditorWebFontSource["settingFields"] {
  const authentication = descriptor.authentication;
  if (authentication.type === "none") return [];
  return [{
    key: authentication.settingKey,
    label: toClassicBilingualText(authentication.label),
    required: true,
    secret: true
  }];
}

/**
 * Maps protocol translations into Classic's two bundled UI locales.
 *
 * @param text - Protocol-localized text.
 * @returns Classic bilingual product text.
 */
function toClassicBilingualText(text: QuireFontSourceText): ClassicEditorBilingualText {
  return {
    "zh-CN": text.translations?.["zh-CN"] ?? text.default,
    en: text.translations?.en ?? text.default
  };
}
