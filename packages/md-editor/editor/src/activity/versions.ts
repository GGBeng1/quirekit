import { v4 as uuidv4 } from "uuid";
import type { ChangeSpec } from "@quirekit/cm-state";
import { activityKinds, type VersionRecord } from "@quirekit/edit-history";
import { withSourceOperation, type MsfeEditor } from "@quirekit/msfe-core";
import { diffLines, splitLines } from "./lines";
import type { MdActivityRecorder } from "./recorder";
import type { MdActivityOptions, MdVersionRestoreResult } from "./types";

/**
 * Saves and restores whole-document versions of one editor through the host version store. Version content is
 * the editor source with `\n` line breaks. In collaboration mode the server writes the activity events, so this
 * controller only records `version.create` itself when it writes the activity store directly.
 */
export class MdVersions {
  /** @param editor - Owning editor. @param options - Late-bound options. @param recorder - Recorder whose confirmed sequence versions refer to. */
  constructor(private readonly editor: MsfeEditor, private readonly options: () => MdActivityOptions, private readonly recorder: MdActivityRecorder) {}

  /**
   * Saves the current source. An unnamed save is automatic and reuses the latest version when nothing changed.
   * @param name - Name of a permanent version.
   * @returns The new or reused version.
   */
  async save(name?: string): Promise<VersionRecord> {
    const trimmed = name?.trim();
    const record = await this.create(trimmed ? "named" : "auto", this.editor.state.doc.toString(), trimmed);
    const { store, actor, hints, documentId, epoch, sessionId, onError } = this.options();
    if (trimmed && store && actor && !hints) {
      store.append([{ documentId, epoch, operationId: uuidv4(), actor, source: "human", kind: activityKinds.versionCreate, kindVersion: 1,
        facts: { versionId: record.id, name: trimmed }, ...(sessionId ? { sessionId } : {}) }]).catch(onError);
    }
    return record;
  }

  /**
   * Replaces the document with a saved version as one undoable edit labelled `version.restore`. The current source
   * is saved first, and only differing lines are rewritten so comments and collaboration anchors on kept lines survive.
   * @param id - Version identity.
   * @returns Whether the document changed, or why the restore was refused.
   */
  async restore(id: string): Promise<MdVersionRestoreResult> {
    const versions = this.options().versions;
    if (!versions) return { ok: false, reason: "unavailable" };
    if (this.editor.state.readOnly) return { ok: false, reason: "readonly" };
    const found = await versions.read(id);
    if (!found || found.record.documentId !== this.options().documentId) return { ok: false, reason: "missing" };
    if (found.content.format !== "markdown") return { ok: false, reason: "format" };
    const target = found.content.value.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    if (target === this.editor.state.doc.toString()) return { ok: true, changed: false };
    await this.create("auto", this.editor.state.doc.toString());
    // The source may have changed while the store answered, so the change set is planned against the dispatch state.
    const result = this.editor.run(withSourceOperation(state => ({ changes: restoreChanges(state.doc.toString(), target), scrollIntoView: true }),
      { kind: activityKinds.versionRestore, facts: { versionId: id, ...(found.record.name ? { name: found.record.name } : {}) } }));
    if (!result.ok) return { ok: false, reason: result.reason === "readonly" ? "readonly" : "rejected" };
    await this.create("restore", target);
    return { ok: true, changed: true };
  }

  /** @param trigger - How the version came to exist. @param value - Source. @param name - Permanent name. @returns Stored record. */
  private create(trigger: "auto" | "named" | "restore", value: string, name?: string): Promise<VersionRecord> {
    const { versions, documentId, epoch, actor } = this.options();
    if (!versions) return Promise.reject(new Error("MdActivity has no version store"));
    return versions.create({ documentId, epoch, sequence: this.recorder.confirmedSequence, trigger, ...(actor ? { actor } : {}), ...(name ? { name } : {}) },
      { format: "markdown", value });
  }
}

/**
 * @param current - Current source.
 * @param target - Restored source.
 * @returns Line-level replacements in ascending order turning the current source into the target.
 */
export function restoreChanges(current: string, target: string): ChangeSpec[] {
  const a = splitLines(current), b = splitLines(target), starts = [0];
  for (const line of a) starts.push(starts.at(-1)! + line.length);
  return diffLines(a, b).map(hunk => ({ from: starts[hunk.fromA]!, to: starts[hunk.toA]!, insert: b.slice(hunk.fromB, hunk.toB).join("") }));
}
