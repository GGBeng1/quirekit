import type { ActivityActor, ActivityStore, VersionStore } from "@quirekit/edit-history";
import type { ActivityHint } from "@quirekit/edit-history/writer";

/** Records local edits of one editor into a host activity store. */
export interface MdActivityOptions {
  /** Host store receiving confirmed-intent events; null disables recording. */
  readonly store: ActivityStore | null;
  /** Host document identity. */
  readonly documentId: string;
  /** Host version store used by `getMdVersions`; null disables versions. */
  readonly versions: VersionStore | null;
  /** Document generation; defaults to `1`. */
  readonly epoch: string;
  /** Current author; use trust `local` unless an authenticated writer confirms events. */
  readonly actor: ActivityActor | null;
  /** Editing session, keeping display groups within one connection. */
  readonly sessionId?: string | undefined;
  /** Consecutive typing in one block within this window becomes one event; default 3000 ms. */
  readonly mergeMs: number;
  /** Byte limit of each before/after fragment; default 4096. */
  readonly maxContentBytes: number;
  /**
   * Collaboration mode: send hints for labelled operations to the confirming server instead of writing the store.
   * Typing needs no hint; the server derives it from the updates it receives.
   */
  readonly hints: ((hint: Omit<ActivityHint, "type" | "version">) => void) | null;
  /** @param error - Store failure; recording continues with later events. */
  readonly onError: (error: unknown) => void;
}

/** Recognized local change before it becomes a pending event. */
export interface MdActivityChange {
  /** Feature-named kind. */
  readonly kind: string;
  /** Kind-owned facts. */
  readonly facts: Readonly<Record<string, unknown>>;
  /** Event origin. */
  readonly source: "human" | "ai";
  /** Whether consecutive changes of this kind in one block may merge. */
  readonly mergeable: boolean;
}

/** Outcome of restoring a version. */
export type MdVersionRestoreResult =
  | { readonly ok: true; readonly changed: boolean }
  | { readonly ok: false; readonly reason: "unavailable" | "readonly" | "missing" | "format" | "rejected" };
