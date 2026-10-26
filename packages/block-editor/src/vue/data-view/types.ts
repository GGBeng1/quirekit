import type { ShallowRef } from "vue";
import type { BlockDataViewSnapshot, BlockDataViewSurface } from "../../data-view/inline/types";

/** One component retained inside the product's existing provider tree. */
export interface BlockDataViewEntry {
  /** Unique mount identity, independent of source IDs and document positions. */
  readonly key: number;
  /** Opaque document node view and Teleport destination. */
  readonly surface: BlockDataViewSurface;
  /** Controlled props changed only by the node view's declared dependencies. */
  readonly state: ShallowRef<BlockDataViewSnapshot>;
}
