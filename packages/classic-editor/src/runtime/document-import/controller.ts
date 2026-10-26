import type {
  ClassicEditorImportArtifact, ClassicEditorImportOptions,
  ClassicEditorRegistrySnapshot
} from "../../types";
import { importClassicEditorDocument } from "../documents";
import type { ClassicDocumentImportAttempt, ClassicDocumentImportOwner } from "./types";

/** Enforces latest-operation ownership and one guarded synchronous import commit. */
export class ClassicDocumentImportController {
  private active: ClassicDocumentImportAttempt | undefined;

  /** @param owner - Current mounted session and accepted document revision. */
  constructor(private readonly owner: ClassicDocumentImportOwner) {}

  /** Invalidates preparation; a command already inside its synchronous commit cannot be cancelled. */
  cancel(): void {
    const active = this.active;
    if (active && !active.committed && !active.committing) active.controller.abort();
  }

  /**
   * Runs a format service against a captured target without granting an unchecked late write.
   * @param registry - Current format services.
   * @param serviceId - Selected service.
   * @param input - Source artifact.
   * @param options - Optional host cancellation.
   * @returns Whether this result still owns the current document's product metadata.
   */
  async run(
    registry: ClassicEditorRegistrySnapshot,
    serviceId: string,
    input: ClassicEditorImportArtifact,
    options: ClassicEditorImportOptions = {}
  ): Promise<boolean> {
    this.cancel();
    const context = this.owner.readContext();
    if (!context || context.editor.isDestroyed) throw new Error("Mount the Classic editor before importing a document.");
    if (!context.editor.isEditable) throw new Error("Cannot import into a read-only document.");
    const attempt: ClassicDocumentImportAttempt = {
      context, document: context.editor.state.doc, revision: this.owner.readRevision(),
      controller: new AbortController(), committed: false, committing: false,
    };
    this.active = attempt;
    /** Forwards cancellation only while the original preparation still owns its write. */
    const cancel = (): void => {
      if (!attempt.committed && !attempt.committing) attempt.controller.abort();
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();
    let removeAbort = (): void => {};
    try {
      this.assertCurrent(attempt);
      const aborted = new Promise<never>((_resolve, reject) => {
        /** Rejects promptly while a non-cooperative codec may still be finishing privately. */
        const onAbort = (): void => { reject(abortedImport()); };
        attempt.controller.signal.addEventListener("abort", onAbort, { once: true });
        removeAbort = () => attempt.controller.signal.removeEventListener("abort", onAbort);
      });
      await Promise.race([
        importClassicEditorDocument(registry, serviceId, {
          ...context, signal: attempt.controller.signal,
          commit: write => this.commit(attempt, write),
        }, input),
        aborted,
      ]);
      if (!attempt.committed) throw new Error("Import service must commit through context.commit().");
      const current = this.owner.readContext();
      return this.active === attempt && current?.editor === context.editor
        && current.editor.state.doc === attempt.committedDocument;
    } finally {
      removeAbort();
      options.signal?.removeEventListener("abort", cancel);
      if (this.active === attempt) this.active = undefined;
    }
  }

  /** @param attempt - Captured target. Throws before any stale or forbidden document command. */
  private assertCurrent(attempt: ClassicDocumentImportAttempt): void {
    const current = this.owner.readContext();
    if (attempt.controller.signal.aborted || this.active !== attempt
      || current?.editor !== attempt.context.editor || current.editor.isDestroyed
      || !current.editor.isEditable || this.owner.readRevision() !== attempt.revision
      || current.editor.state.doc !== attempt.document) throw abortedImport();
  }

  /** @param attempt - Attempt owning this write. @param write - Synchronous typed command. */
  private commit(attempt: ClassicDocumentImportAttempt, write: () => boolean): void {
    if (attempt.committed || attempt.committing) throw new Error("An import can commit only once.");
    this.assertCurrent(attempt);
    attempt.committing = true;
    try {
      const previous = attempt.context.editor.state.pm;
      // Command booleans describe handling; PM filters may still reject dispatch.
      // Require an accepted state, without scanning or serializing its document.
      if (write() !== true || attempt.context.editor.state.pm === previous) {
        throw new Error("Document import command was not accepted.");
      }
      attempt.committedDocument = attempt.context.editor.state.doc;
      attempt.committed = true;
    } finally { attempt.committing = false; }
  }
}

/** @returns Stable cancellation identity without exposing file or codec details. */
function abortedImport(): DOMException {
  return new DOMException("Document import was cancelled or its target changed.", "AbortError");
}
