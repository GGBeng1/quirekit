import type { ComponentViewRenderer, StateSlot } from "@quirekit/msfe-core";
import type { RangeSet, Text } from "@quirekit/cm-state";
import type { Tree } from "@lezer/common";
import type { ContainerRange } from "./query";

/** Safe named containers; HTML attributes and executable render functions are not document syntax. */
export interface ContainerOptions {
  /** Accepted names; unknown names remain ordinary Markdown. */
  readonly types: readonly string[];
  /** Initial details view state, reset when a different document is installed. */
  readonly detailsOpen: boolean;
  /** Host component-library control; omitted uses a plain accessible native button. */
  readonly controls?: ComponentViewRenderer<ContainerControlProps>;
  /** @param expanded - Current state. @param title - Literal title or container name. @returns Localized action. */
  readonly toggleLabel: (expanded: boolean, title: string) => string;
}

/** Source-neutral disclosure control, with no second content or selection owner. */
export interface ContainerControlProps {
  /** Current effective visibility. */
  readonly expanded: boolean;
  /** Host-localized accessible action. */
  readonly label: string;
  /** Requests a source-neutral view transaction. */
  readonly toggle: () => void;
}

/** Canonical single-line fields; title is plain text, not rendered HTML. */
export interface ContainerAttributes {
  /** Registered literal role. */
  readonly name: string;
  /** Trimmed trailing header source. */
  readonly title: string;
}

/** Confirmed complete container coordinates in the accepted document. */
export interface ContainerEntry extends ContainerAttributes {
  /** Opening fence start, after any outer list or quote prefix. */
  readonly from: number;
  /** Closing fence end. */
  readonly to: number;
  /** Opening line end, also the hidden body's start. */
  readonly headerEnd: number;
}

/** Retained syntax query, rebuilt only when document or accepted parse changes. */
export interface ContainerIndex {
  /** Pending parses expose source without discarding mapped user choices. */
  readonly ready: boolean;
  /** Accepted parser identity. */
  readonly tree: Tree;
  /** Canonical text identity. */
  readonly doc: Text;
  /** Details containers in source order. */
  readonly entries: readonly ContainerEntry[];
  /** Logarithmic endpoint lookup, including nested ancestors. */
  readonly ranges: RangeSet<ContainerRange>;
}

/** Actual disclosure-query work along an editor-state lineage, excluding native parsing. */
export interface ContainerIndexWork {
  /** Confirmed syntax queries, including complete rebuilds and incremental ranges. */
  queries: number;
  /** Native syntax nodes visited by disclosure collection. */
  visitedNodes: number;
}

/** Ephemeral document-local disclosure state. */
export interface ContainerState {
  /** Source-derived interval query. */
  readonly index: ContainerIndex;
  /** Explicit or selection-induced choices, indexed by mapped opening source positions. */
  readonly expanded: ReadonlyMap<number, boolean>;
  /** Current closed ancestors; hidden descendant controls are not mounted. */
  readonly hidden: RangeSet<ContainerRange>;
}

/** Per-installation state slot retained across mode changes. */
export interface ContainerStorage {
  /** Canonical state dependency for both direct folding and visible controls. */
  readonly disclosure: StateSlot<ContainerState>;
}
