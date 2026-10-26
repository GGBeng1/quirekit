import { Extension, type MsfeEditor } from "@quirekit/msfe-core";
import { MdActivityRecorder } from "./recorder";
import { MdVersions } from "./versions";
import type { MdActivityOptions } from "./types";

/** Records local edits into a host activity store; remote and external changes are left to their own writers. */
export const MdActivity = Extension.create<MdActivityOptions, { recorder: MdActivityRecorder; versions?: MdVersions }>({ name: "mdActivity",
  /** @returns Recording disabled until the host supplies a store and an actor. */
  addOptions: () => ({ store: null, versions: null, documentId: "document", epoch: "1", actor: null, hints: null, mergeMs: 3000, maxContentBytes: 4096, onError: console.error }),
  /** @returns One recorder per editor, reading the latest options. */
  addStorage() { return { recorder: new MdActivityRecorder(() => this.options) }; },
  /** @returns Disposer retiring the version controller with the editor. */
  onCreate() {
    this.storage.versions = new MdVersions(this.editor, () => this.options, this.storage.recorder);
    return () => { delete this.storage.versions; };
  },
  /** @param event - Accepted transaction. */
  onTransaction({ transaction }) { this.storage.recorder.record(transaction); },
  /** Emits pending typing when the editor loses focus. */
  onBlur() { this.storage.recorder.flush(); },
  /** Emits pending typing before the editor goes. */
  onDestroy() { this.storage.recorder.destroy(); },
});

/** @param editor - Mounted editor. @returns Its version controller, or null when MdActivity is not installed. */
export function getMdVersions(editor: MsfeEditor): MdVersions | null {
  return (editor.storage.mdActivity as { versions?: MdVersions } | undefined)?.versions ?? null;
}
