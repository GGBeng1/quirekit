import type { Node } from "@quirekit/pm";

/** Single searchable insertion declaration consumed by both entry points. */
export interface BlockInsertItem {
  /** Stable product intent. */
  readonly id: string;
  /** Visible name. */
  readonly label: string;
  /** Purpose shown below the name. */
  readonly description: string;
  /** Shared registry icon. */
  readonly icon: string;
  /** Task group label. */
  readonly group: string;
  /** Search aliases. */
  readonly keywords: string;
  /** Required canonical schema node. */
  readonly node: string;
  /** Whether the slash path can capture a target for this entry. */
  readonly slash: boolean;
}
/** Bounded committed slash source; an immutable document guards acceptance. */
export interface BlockSlashTarget {
  /** Document at capture time. */
  readonly doc: Node;
  /** Position before the whole paragraph. */
  readonly from: number;
  /** End of the whole paragraph. */
  readonly to: number;
  /** Committed trigger plus query. */
  readonly text: string;
}
