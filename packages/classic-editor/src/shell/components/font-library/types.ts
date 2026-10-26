import type { ClassicEffectiveFontTarget } from "@classic/extensions/typography/effective-format";

/** Script target selected by the compact font control. */
export type ClassicFontTarget = ClassicEffectiveFontTarget;

/** Selection script target or document-default authoring scope. */
export type ClassicFontPickerTarget = ClassicFontTarget | "document";

/** Effective direct-family state for one compact picker target. */
export interface ClassicMarkedFontTarget {
  /** Effective direct family, or null when inherited or mixed. */
  readonly family: string | null;
  /** Whether direct formatting owns the target even when its value is mixed. */
  readonly hasDirect: boolean;
}

/** One stable source row projected into the compact font picker. */
export interface ClassicFontOptionSource<
  T extends { readonly family: string },
  M extends { readonly family: string } = { readonly family: string }
> {
  /** Logical CSS family shown and applied by the compact picker. */
  readonly family: string;
  /** Matching imported provider record, when the current family is imported. */
  readonly imported: T | undefined;
  /** Matching application-mounted family that requires no import or download. */
  readonly mounted?: M | undefined;
  /** Whether this row represents the effective current family. */
  readonly current: boolean;
  /** Whether this row represents one document body default script family. */
  readonly documentDefault: boolean;
}

/** Authoritative missing-font diagnostics rendered by one font option. */
export type ClassicFontAvailabilityDiagnostic = "substituted" | "unresolved";
