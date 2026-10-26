import type { ComputedRef } from "vue";
import type { QuireKitEditorIconEntry, QuireKitEditorIconGroup } from "../../components/icon/types";

/** Icon catalog labeled in the active language. */
export interface QuireKitEditorIconCatalogState {
  /** Browsable groups with labeled icons, in browsing order. */
  readonly groups: ComputedRef<readonly QuireKitEditorIconGroup[]>;
  /** Searchable entries whose labels and keywords follow the active language. */
  readonly entries: ComputedRef<readonly QuireKitEditorIconEntry[]>;
}
