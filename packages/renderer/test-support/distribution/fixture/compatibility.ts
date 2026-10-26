import type {
  QuireDisplayList, QuireDocumentRange, QuireDrawSurface, QuireFontServiceSource,
  QuireLayoutDomOverlay, QuireRect
} from "@quirekit/render-contract";
import type {
  QuireDisplayList as LegacyList, QuireDocumentRange as LegacyRange,
  QuireDrawSurface as LegacySurface, QuireFontServiceSource as LegacyFont,
  QuireLayoutDomOverlay as LegacyOverlay, QuireRect as LegacyRect
} from "@quirekit/renderer";

/** Requires an equality check to succeed during standalone declaration checking. */
type Assert<Value extends true> = Value;
/** Compares types in both directions without allowing a wider legacy alias. */
type Equal<First, Second> =
  (<Value>() => Value extends First ? 1 : 2) extends
  (<Value>() => Value extends Second ? 1 : 2) ? true : false;

/** Checks one public type from each moved domain through both package roots. */
export type LegacyCompatibility = [
  Assert<Equal<QuireDisplayList, LegacyList>>,
  Assert<Equal<QuireDocumentRange, LegacyRange>>,
  Assert<Equal<QuireDrawSurface, LegacySurface>>,
  Assert<Equal<QuireFontServiceSource, LegacyFont>>,
  Assert<Equal<QuireLayoutDomOverlay, LegacyOverlay>>,
  Assert<Equal<QuireRect, LegacyRect>>
];
