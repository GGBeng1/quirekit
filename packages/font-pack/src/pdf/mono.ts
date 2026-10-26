import type {
  QuirePortableMonoFontAsset,
  QuirePortableMonoFontSourceOptions,
  QuirePortablePdfFontSource
} from "./types";

/**
 * Complete static monospace faces for fixed-layout formats without a standard
 * Courier, such as OFD. Native PDF keeps its standard Courier fallback.
 */
export const quirePortableMonoFontAssets:
readonly QuirePortableMonoFontAsset[] = Object.freeze([
  Object.freeze({ id: "dejavu-sans-mono-400-normal", fileName: "DejaVuSansMono.ttf", family: "DejaVu Sans Mono", weight: 400, style: "normal", subset: true }),
  Object.freeze({ id: "dejavu-sans-mono-400-italic", fileName: "DejaVuSansMono-Oblique.ttf", family: "DejaVu Sans Mono", weight: 400, style: "italic", subset: true }),
  Object.freeze({ id: "dejavu-sans-mono-700-normal", fileName: "DejaVuSansMono-Bold.ttf", family: "DejaVu Sans Mono", weight: 700, style: "normal", subset: true }),
  Object.freeze({ id: "dejavu-sans-mono-700-italic", fileName: "DejaVuSansMono-BoldOblique.ttf", family: "DejaVu Sans Mono", weight: 700, style: "italic", subset: true })
] satisfies QuirePortableMonoFontAsset[]);

/** Logical code families this face replaces without a compatibility warning. */
export const quirePortableMonoSubstitutions: readonly string[] = Object.freeze([
  "Courier New",
  "Courier",
  "Consolas",
  "JetBrains Mono",
  "monospace"
]);

/**
 * Creates the optional portable monospace font sources.
 *
 * @param options - Application-owned asset loader.
 * @returns Frozen structurally compatible font sources, loaded lazily.
 */
export function createQuirePortableMonoFontSources(
  options: QuirePortableMonoFontSourceOptions
): readonly QuirePortablePdfFontSource[] {
  return Object.freeze(quirePortableMonoFontAssets.map((asset) => Object.freeze({
    id: `quire-font-pack-${asset.id}`,
    family: asset.family,
    acceptedSubstitutions: quirePortableMonoSubstitutions,
    data: () => options.loadAsset(asset),
    weight: asset.weight,
    style: asset.style,
    subset: asset.subset
  })));
}
