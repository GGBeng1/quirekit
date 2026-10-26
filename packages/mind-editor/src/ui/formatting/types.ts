import type { MindMapNodeStyle } from "@quirekit/mind-map";
import type { QuireKitSelectItem } from "@quirekit/ui";

/** One bounded public selector for an admitted formatting field. */
export interface MindStyleSelectField {
  /** Canonical field. */ readonly key: keyof MindMapNodeStyle;
  /** Visible and accessible name. */ readonly label: string;
  /** Default plus admitted explicit values. */ readonly items: readonly QuireKitSelectItem[];
}
