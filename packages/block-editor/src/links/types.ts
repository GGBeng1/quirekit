import type { Node, Selection } from "@quirekit/pm";
import type { LinkRange } from "@quirekit/extension-link";

/** Exact source lease for a link task, independent of native input focus. */
export interface BlockLinkTarget {
  /** Canonical document revision captured on opening. */
  readonly doc: Node;
  /** Canonical selection; a later selection revokes this task. */
  readonly selection: Selection;
  /** Complete existing occurrence, or null when creating a link. */
  readonly range: LinkRange | null;
  /** Existing display text, including every formatting run. */
  readonly text: string;
  /** Whether replacing the label preserves the selected structure. */
  readonly textEditable: boolean;
  /** Permission at capture time. */
  readonly editable: boolean;
}
