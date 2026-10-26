import type { Component, MaybeRefOrGetter } from "vue";
import type {
  QuireKitToolbarEntry,
  QuireKitToolbarExecuteEvent,
  QuireKitToolbarOpenChangeEvent
} from "@quirekit/ui";
import type { QuireKitToolbarRenderers } from "@quirekit/ui/vue";
import type { ClassicEditorRenderContext } from "../context";

/** Stable reactive input supplied to one feature's Toolbar configuration. */
export interface ClassicEditorToolbarContributionState {
  /** Latest mounted context, replaced as selection, locale or capability changes. */
  readonly context: ClassicEditorRenderContext;
  /** Optional exact-target guard checked before delayed or direct document mutations. */
  readonly isTargetCurrent?: () => boolean;
}

/** Feature-owned entries and bodies rendered through the public Toolbar. */
export interface ClassicEditorToolbarContribution {
  /** Individual public controls; reactive getters preserve live selection state. */
  readonly items: MaybeRefOrGetter<readonly QuireKitToolbarEntry[]>;
  /** Public custom controls and popup bodies referenced by the individual entries. */
  readonly renderers?: QuireKitToolbarRenderers;
  /** Feature-owned reactive state passed unchanged to its registered renderers. */
  readonly context?: unknown;
  /** Feature-owned Dialog or other retained task surface receiving the configuration's context prop. */
  readonly surface?: Component;
  /**
   * Executes an accepted intent using the latest feature context.
   * @param event - Original feature entry, local value and local ancestry.
   * @returns Optional handled result or completion of asynchronous feature work.
   */
  readonly execute?: (event: QuireKitToolbarExecuteEvent) => void | boolean | Promise<void | boolean>;
  /**
   * Applies a popup request while retaining feature draft and cancellation policy.
   * @param event - Original feature entry and requested controlled popup state.
   */
  readonly openChange?: (event: QuireKitToolbarOpenChangeEvent) => void;
}

/**
 * Creates one retained feature configuration inside a Vue setup lifecycle.
 * Factories may use computed, watch and unmount hooks; ordinary context changes
 * update the same state object rather than remounting the feature.
 * @param state - Stable state whose context always reflects the mounted editor.
 * @returns Public entries, body renderers and feature-owned event handlers.
 */
export type ClassicEditorToolbarContributionFactory = (
  state: ClassicEditorToolbarContributionState
) => ClassicEditorToolbarContribution;
