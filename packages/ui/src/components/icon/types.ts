import type { quireKitEditorIconData } from "./catalog";
import type { quireKitReviewIconSvg } from "./review";

/** Stable bundled icon names, including compatibility names. */
export type QuireKitEditorIconName = keyof typeof quireKitEditorIconData;
/** Stable names of the shared review family. */
export type QuireKitReviewIconName = keyof typeof quireKitReviewIconSvg;

/** Approved optical sizes for QuireKit interface icons. */
export type QuireKitIconSize = 12 | 16 | 20 | 24;

/** Auditable glyph sources actually shipped by the icon catalog. */
export type QuireKitIconSource = "lucide" | "tabler" | "custom";

/** General-interface and editor-task families in the public icon catalog. */
export type QuireKitEditorIconCategory =
  | "navigation"
  | "files"
  | "status"
  | "security"
  | "communication"
  | "time"
  | "media"
  | "tools"
  | "shapes"
  | "actions"
  | "formatting"
  | "paragraph"
  | "insert"
  | "review"
  | "table"
  | "view";

/** Immutable, renderer-ready SVG icon data. */
export interface QuireKitIconData {
  /** Normalized trusted SVG markup rendered by framework adapters. */
  readonly svg: string;
  /** Intrinsic SVG coordinate system retained for audits and previews. */
  readonly viewBox: string;
  /** Source family used to audit licensing and visual consistency. */
  readonly source: QuireKitIconSource;
  /** Upstream or product license identifier for the glyph. */
  readonly license: string;
  /** Whether directional artwork should mirror in right-to-left layouts. */
  readonly mirrorInRtl: boolean;
  /** Centered optical scale used to normalize visually oversized artwork. */
  readonly opticalScale: number;
  /** Number of visible SVG geometry elements in the normalized glyph. */
  readonly complexity: number;
}

/** One discoverable editor icon and the metadata needed by catalogs. */
export interface QuireKitEditorIconEntry<Name extends string = QuireKitEditorIconName> {
  /** Stable name accepted by QuireIcon. */
  readonly name: Name;
  /** Human-readable semantic label used by the directory and search. */
  readonly label: string;
  /** Whether the icon serves general interfaces or document editing. */
  readonly scope: "general" | "editor";
  /** Stable, explicitly ordered subgroup identifier. */
  readonly group: string;
  /** Original Lucide filename, absent for original editor artwork. */
  readonly upstream: string | undefined;
  /** Task family used for filtering and documentation. */
  readonly category: QuireKitEditorIconCategory;
  /** Search terms beyond the stable camel-case name. */
  readonly keywords: readonly string[];
  /** Audited renderer-ready icon data. */
  readonly data: QuireKitIconData;
}

/** Inputs used to admit one trusted SVG glyph into a registry. */
export interface DefineQuireKitIconOptions {
  /** Raw SVG markup from an audited build-time source or reviewed custom asset. */
  readonly svg: string;
  /** Source family used to audit licensing and visual consistency. */
  readonly source: QuireKitIconSource;
  /** Upstream or product license identifier for the glyph. */
  readonly license: string;
  /** Whether directional artwork should mirror in right-to-left layouts. */
  readonly mirrorInRtl?: boolean | undefined;
  /** Centered optical scale in the inclusive range from 0.5 through 1. */
  readonly opticalScale?: number | undefined;
}

/** Options controlling one immutable named icon registry. */
export interface CreateQuireKitIconRegistryOptions<Name extends string> {
  /** Compatibility names that resolve to canonical entries. */
  readonly aliases?: Readonly<Record<string, Name>> | undefined;
  /** Explicit fallback used when a requested name is absent. */
  readonly fallback?: Name | undefined;
}

/** Immutable named icon lookup shared by framework adapters and products. */
export interface QuireKitIconRegistry<Name extends string = string> {
  /** Canonical registered icon names in stable insertion order. */
  readonly names: readonly Name[];
  /** Explicit fallback name, when the product elects to provide one. */
  readonly fallback: Name | undefined;
  /**
   * Tests whether a canonical or aliased icon name is registered.
   *
   * @param name - Candidate icon name.
   * @returns Whether the registry can resolve the name without fallback.
   */
  readonly has: (name: string) => boolean;
  /**
   * Resolves one icon name, applying aliases and then the explicit fallback.
   *
   * @param name - Requested icon name.
   * @returns Trusted icon data, or undefined when neither the name nor fallback exists.
   */
  readonly resolve: (name: string) => QuireKitIconData | undefined;
}

/** One canonical icon inside a labeled catalog group. */
export interface QuireKitEditorIconGroupItem {
  /** Stable name accepted by QuireIcon. */
  readonly name: QuireKitEditorIconName;
  /** Original Lucide filename, or `custom` for original editor artwork. */
  readonly upstream: string;
  /** Display label in the requested language. */
  readonly label: string;
}

/** One browsable icon group with display text in the requested language. */
export interface QuireKitEditorIconGroup {
  /** Stable, explicitly ordered group identifier. */
  readonly id: string;
  /** Group display name in the requested language. */
  readonly label: string;
  /** Task family used for filtering and documentation. */
  readonly category: QuireKitEditorIconCategory;
  /** Whether the group serves general interfaces or document editing. */
  readonly scope: "general" | "editor";
  /** Canonical icons in browsing order. */
  readonly icons: readonly QuireKitEditorIconGroupItem[];
}
