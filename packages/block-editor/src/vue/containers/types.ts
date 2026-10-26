import type { Ref } from "vue";
import type { Node as PMNode } from "@quirekit/pm";
import type { BlockContainerSurface, BlockContainerState, BlockContainerAttributes } from "../../containers/types";

/** Mutable form draft, separate from immutable canonical attributes. */
export type BlockContainerDraft = { -readonly [Key in keyof BlockContainerAttributes]: BlockContainerAttributes[Key] };

/** Retained provider entry; Vue renders only the controls outside contentDOM. */
export interface BlockContainerEntry {
  /** Stable mount identity. */ readonly key: number;
  /** Framework-neutral retained surface. */ readonly surface: BlockContainerSurface;
  /** Attributes and permission only. */ readonly state: Ref<BlockContainerState>;
}
/** Explicit editing task with exact canonical ownership. */
export interface BlockContainerTarget {
  /** Opening document identity. */ readonly doc: PMNode;
  /** Captured source node. */ readonly node: PMNode;
  /** Source boundary. */ readonly position: number;
  /** Requested control. */ readonly mode: "settings" | "emoji";
}
