import type { Text as SourceText } from "@quirekit/cm-state";
import type { Doc, Text } from "yjs";
import type { CollaborationHistory } from "../history/controller";
import type { CollaborationManifest } from "../session/types";

/** Session-owned resources used by one active editor binding. */
export interface BindingContext {
  /** Shared CRDT document. */
  readonly document: Doc;
  /** Single shared Markdown text. */
  readonly text: Text;
  /** Validated admission. */
  readonly manifest: CollaborationManifest;
  /** Local history, retained across editor reattachment. */
  readonly history: CollaborationHistory;
  /** Local author origin, tracked by UndoManager. */
  readonly origin: object;
  /** Shared edits explicitly excluded from local history. */
  readonly untrackedOrigin: object;
  /** @returns Effective source-owner permission. */
  writable(): boolean;
  /** @returns Document update generation for snapshot/subscribe handoff validation. */
  version(): number;
  /** @param source - Last accepted immutable editor text; not serialized on input. */
  accepted(source: SourceText): void;
  /** @param notify - Accepted observations delayed until source and history have settled. */
  publish(notify: () => void): void;
  /** @param error - Irrecoverable projection/commit failure. */
  fault(error: unknown): void;
  /** Ends the session's active-editor reservation. */
  released(): void;
}
