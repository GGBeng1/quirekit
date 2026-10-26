import type { QuireEditor } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import type { QuireViewEngineFrameBuildOptions, QuireViewEngineRuntime } from "../../src/frame/types";

/** Optional geometry pressures for the shared independent-layout fixture. */
export interface InputLayoutFixtureOptions {
  /** Section/Story source by default, or independent top-level body flow. */
  readonly structure?: "section" | "plain";
  /** Floating-object height in pixels, defaulting to the compact fixture. */
  readonly wrapHeight?: number;
  /** Page height in twips, allowing sibling wrap to remain on the same page. */
  readonly pageHeightDxa?: number;
}

/** Real Word source and retained authority shared by the input oracle cases. */
export interface InputLayoutFixture {
  /** Editor containing the selected legal section/Story or direct-body structure. */
  readonly editor: QuireEditor;
  /** Runtime warmed before each incremental change. */
  readonly runtime: QuireViewEngineRuntime;
  /** Identical geometry and deterministic font authority for both paths. */
  readonly options: QuireViewEngineFrameBuildOptions;
  /** Actual dispatched transactions awaiting the next oracle comparison. */
  readonly transactions: Transaction[];
}
