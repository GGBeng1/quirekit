import type { ShallowRef } from "vue";
import type { BlockCodeState, BlockCodeSurface } from "../../code/types";
/** Mounted header entry without ownership of code text. */
export interface BlockCodeEntry {
  /** Stable framework identity. */
  readonly key: number;
  /** Retained document NodeView. */
  readonly surface: BlockCodeSurface;
  /** Attribute and permission projection. */
  readonly state: ShallowRef<BlockCodeState>;
}
