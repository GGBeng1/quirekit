import type { ComputedRef } from "vue";
import type {
  ClassicEditorFontLibrary,
  ClassicEditorWebFontFamily,
  ClassicEditorWebFontSource
} from "@classic/types";

/** Reactive dependencies owned by the catalog controller. */
export interface UseClassicFontCatalogOptions {
  /** Mounted headless font library. */
  readonly library: ComputedRef<ClassicEditorFontLibrary | undefined>;
  /** Currently selected source adapter; absent for local recommendations. */
  readonly selectedSource: ComputedRef<ClassicEditorWebFontSource | undefined>;
  /** Curated rows available without a remote browse request. */
  readonly curatedResults: ComputedRef<readonly ClassicEditorWebFontFamily[]>;
  /** Provider subset tokens selected by the language filter. */
  readonly selectedSubsets: ComputedRef<readonly string[]>;
}
