import type { ActivityEvent, ActivityStore, ActivityTarget, VersionStore } from "@quirekit/edit-history";
import type { MdEditorLocale } from "../types";

/** Where an activity happened now; ranges are present only when the place could be found. */
export type MdActivityLocation =
  | { readonly status: "exact" | "approximate"; readonly range: { readonly from: number; readonly to: number } }
  | { readonly status: "deleted" | "unavailable" };

/** @param target - Anchor of another scheme. @returns Its current source range, or null when it cannot be resolved. */
export type MdActivityTargetResolver = (target: ActivityTarget) => { readonly from: number; readonly to: number } | null;

/** Inputs of the activity timeline; data comes only from the host store. */
export interface MdActivityTimelineProps {
  /** Host activity store. */
  readonly store: ActivityStore;
  /** Document whose activity is listed. */
  readonly documentId: string;
  /** Control language. */
  readonly locale: MdEditorLocale;
  /** Caller identity passed to the store's access policy. */
  readonly viewer?: string | undefined;
  /** Whether records are local-only, shown as a notice. */
  readonly local?: boolean | undefined;
  /** @param event - Listed event. @returns Where it happened now. Omitted entries are not clickable. */
  readonly locate?: ((event: ActivityEvent) => MdActivityLocation) | undefined;
  /** @param range - Source range to select and scroll to. */
  readonly reveal?: ((range: { readonly from: number; readonly to: number }) => void) | undefined;
}

/** Options of the activity side panel. */
export interface MdActivityPanelOptions {
  /** Host activity store. */
  readonly store: ActivityStore;
  /** Document whose activity is listed. */
  readonly documentId: string;
  /** Caller identity passed to the store's access policy. */
  readonly viewer?: string | undefined;
  /** Mark records as local-only (single-user, not confirmed by a server). */
  readonly local?: boolean | undefined;
  /** Resolves anchors other than `source-range`, e.g. `relativeActivityResolver(session.document)` in collaboration. */
  readonly resolveTarget?: MdActivityTargetResolver | undefined;
  /** Host version store shared with `MdActivity`'s `versions`; adds the version list. */
  readonly versions?: VersionStore | undefined;
  /** Open the panel when the editor mounts. */
  readonly defaultOpen?: boolean | undefined;
}
