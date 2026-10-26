import type { Component, ComputedRef, ShallowRef } from "vue";
import type { QuireKitToolbarEntry } from "../../../components/toolbar/types";

/** Named Vue controls and popup bodies supplied independently of the editor. */
export type QuireKitToolbarRenderers = Readonly<Record<string, Component>>;

/** Reactive props shared by registered renderers and fallback slots. */
export interface QuireKitToolbarRendererScope {
  /** Current entry including host metadata and parameters. */
  readonly item: QuireKitToolbarEntry;
  /** Stable ancestry within the configured toolbar. */
  readonly path: readonly string[];
  /** Host-owned state snapshot or services; Toolbar never interprets it. */
  readonly context: unknown;
  /** Effective availability, including enclosing groups. */
  readonly disabled: boolean;
  /** Current popup state. */
  readonly expanded: boolean;
  /** Request a popup transition. @param expanded - Requested state. */
  readonly setExpanded: (expanded: boolean) => void;
  /** Request execution. @param payload - Command parameters, defaulting to item.payload. @param nativeEvent - Original native field or action activation. */
  readonly execute: (payload?: unknown, nativeEvent?: Event) => void;
}

/** Registration contract for a custom native toolbar button. */
export interface QuireKitToolbarItemBindings {
  /** Stable item identity attached to the rendered control. */
  readonly id: string;
  /** Native control ref registered with the Toolbar root. */
  readonly element: ShallowRef<HTMLButtonElement | null>;
  /** Reactive roving tabIndex owned by the Toolbar root. */
  readonly tabIndex: ComputedRef<0 | -1>;
  /** Synchronizes pointer focus with the roving Tab stop. */
  readonly handleFocus: () => void;
}
