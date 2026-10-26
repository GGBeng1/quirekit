import type { ShallowRef } from "vue";
import type { Node as PMNode } from "@quirekit/pm";
import type { RichContentSurface } from "../../rich-content/types";
/** Portal entry survives retained node updates. */
export interface RichContentEntry {
  /** Mount identity, independent of document position. */ readonly key: number;
  /** Retained DOM lifetime. */ readonly surface: RichContentSurface;
  /** Last committed source. */ readonly node: ShallowRef<PMNode>;
}
