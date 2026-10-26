import type { ComputedRef, ShallowRef } from "vue";
import type { QuireKitToolbarEntry } from "../../../components/toolbar/types";

/** Reactive inputs of the collapse layout. */
export interface ToolbarCollapseOptions {
  /** Toolbar root that owns the available inline size. */
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
  /** Whether trailing entries collapse into the "more" panel. */
  readonly enabled: () => boolean;
  /** Configured top-level entries. */
  readonly items: () => readonly QuireKitToolbarEntry[];
  /** Retain the current split until the operation surface has physically exited. */
  readonly paused?: () => boolean;
  /** Density/version whose change invalidates cached advances, never pressed or editor state. */
  readonly metrics?: () => unknown;
}

/** Visible row entries and the trailing entries moved into the "more" panel. */
export interface ToolbarCollapseBindings {
  /** Entries rendered in the row. */
  readonly visible: ComputedRef<readonly QuireKitToolbarEntry[]>;
  /** Entries rendered in the "more" panel; empty while everything fits. */
  readonly collapsed: ComputedRef<readonly QuireKitToolbarEntry[]>;
}

/** One collapsible control: a top-level entry, or one child of a top-level group. */
export interface ToolbarCollapseSlot {
  /** Stable measurement key: the entry value, or `group/child` for grouped controls. */
  readonly key: string;
  /** Control or separator entry. */
  readonly entry: QuireKitToolbarEntry;
  /** Owning top-level group, when the control belongs to one. */
  readonly group?: QuireKitToolbarEntry | undefined;
}

/** Entries split between the row and the "more" panel. */
export interface ToolbarCollapseSplit {
  /** Entries kept in the row; partially collapsed groups keep their leading children. */
  readonly visible: readonly QuireKitToolbarEntry[];
  /** Entries moved to the panel; a split group continues there under the same identity. */
  readonly collapsed: readonly QuireKitToolbarEntry[];
}
