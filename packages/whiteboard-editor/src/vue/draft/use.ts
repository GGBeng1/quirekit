import { computed, ref, shallowRef } from "vue";
import type { WhiteboardDocument } from "@quirekit/whiteboard";
import { createWhiteboardDraftStore } from "../../draft/browser";
import { draftIdentity } from "../../draft/record";
import { createDraftSession } from "../../draft/session";
import type { DraftSession, WhiteboardDraftOptions, WhiteboardDraftState } from "../../draft/types";
import { downloadWhiteboardFile } from "../../ui/download";
import { useWhiteboardMessages } from "../messages";
import type { DraftWorkspaceOptions } from "./types";

/** @param options - Current runtime and permission, never document write access. @returns Local recovery lifecycle and explicit user actions. */
export function useWhiteboardDraft(options: DraftWorkspaceOptions) {
  const { text, failure } = useWhiteboardMessages();
  const state = shallowRef<WhiteboardDraftState>(), working = ref(false), error = ref<unknown>();
  const blocked = computed(() => working.value || state.value?.status === "loading" || !!state.value?.candidate);
  const message = computed(() => state.value?.status === "unavailable" ? `${text.value.backupFailed}: ${failure(state.value.error, "storageUnavailable")}`
    : state.value?.pending ? text.value.backupPending : state.value?.savedAt ? text.value.backupSaved : "");
  let session: DraftSession | undefined, generation = 0, release: (() => void) | undefined, owner: Document | undefined;
  /** Captures the last stable input before the drawing runtime is destroyed. */
  function stop(): void { generation++; session?.dispose(); session = undefined; release?.(); release = undefined; }
  /** @param document - Current immutable baseline. @param drafts - Explicit stable host identity. @param mountedOwner - Runtime's own browser document. @returns Initial recovery inspection. */
  async function start(document: WhiteboardDocument, drafts: WhiteboardDraftOptions | undefined, mountedOwner: Document): Promise<void> {
    stop(); const ticket = generation; owner = mountedOwner; state.value = undefined; error.value = ""; working.value = false;
    if (!drafts) return;
    state.value = { status: "loading" };
    try {
      const identity = await draftIdentity(document, drafts);
      if (ticket !== generation) return;
      const store = drafts.store ?? createWhiteboardDraftStore(mountedOwner.defaultView!.indexedDB);
      const current = createDraftSession({ ...identity, store,
        capture: () => options.runtime.value?.captureDraft() ?? null,
        changed: value => { if (ticket === generation) state.value = value; },
      });
      session = current;
      /** Makes the last stable checkpoint while the page is still alive; unload completion is never assumed. */
      function hidden(): void { if (mountedOwner.visibilityState === "hidden") void current.checkpoint(); }
      /** Best-effort page lifecycle checkpoint, supplementing normal idle writes. */
      function leaving(): void { void current.checkpoint(); }
      mountedOwner.addEventListener("visibilitychange", hidden); mountedOwner.defaultView?.addEventListener("pagehide", leaving);
      release = () => { mountedOwner.removeEventListener("visibilitychange", hidden); mountedOwner.defaultView?.removeEventListener("pagehide", leaving); };
      await current.ready;
    } catch (reason) { if (ticket === generation) state.value = { status: "unavailable", error: reason }; }
  }
  /** @returns Native draft restoration without committing to the host document. */
  async function restore(): Promise<void> {
    const current = session, runtime = options.runtime.value, ticket = generation;
    if (!current || !runtime || options.readOnly() || working.value) return;
    working.value = true; error.value = "";
    try {
      runtime.setReadOnly(false);
      await current.restore(scene => runtime.importScene(JSON.stringify(scene)));
      if (ticket === generation) options.changed();
    } catch (reason) { if (ticket === generation) error.value = reason; }
    finally { if (ticket === generation) { working.value = false; runtime.setReadOnly(options.readOnly() || blocked.value); } }
  }
  /** @returns Discard completion for the inspected token, preserving another window's newer draft. */
  async function discard(): Promise<void> {
    if (!session || options.readOnly() || working.value) return;
    const ticket = generation; working.value = true; error.value = "";
    await session.discard(); if (ticket === generation) working.value = false;
  }
  /** Downloads stale source without importing it over a changed canonical board. */
  function download(): void {
    if (owner && state.value?.candidate) downloadWhiteboardFile(owner, new Blob([JSON.stringify(state.value.candidate.scene, null, 2)], { type: "application/json" }), `${text.value.draftFilename}.excalidraw`);
  }
  /** @returns Whether a saved/discarded session's checkpoint was cleared. */
  async function clear(): Promise<boolean> {
    if (!session) return true;
    const current = session, ticket = generation, result = await current.finish();
    if (ticket === generation) state.value = result ? { status: "ready" } : current.state;
    return result;
  }
  return { state, working, error, blocked, message, start, stop, restore, discard, download, clear,
    /** Records an O(1) invalidation, without reading the scene. */
    change() { if (!blocked.value) session?.change(); },
  };
}
