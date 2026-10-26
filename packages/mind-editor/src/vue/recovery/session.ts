import { computed, shallowRef } from "vue";
import type { MindMapDocument } from "@quirekit/mind-map";
import type { MindMapEditor } from "@quirekit/mind-map-simple";
import { createMindMapRecoveryStore } from "../../recovery/browser";
import { MindMapRecoveryError } from "../../recovery/errors";
import { mindMapRecoveryIdentity } from "../../recovery/record";
import { createMindMapRecoverySession } from "../../recovery/session";
import type { MindEditorRecoveryOptions, MindMapRecoverySession, MindMapRecoveryState } from "../../recovery/types";
import type { MindEditorDrafts } from "../../runtime/drafts/types";

/** @param report - Public popup failure sink. @param writable - Current host permission. @returns Optional local persistence ownership, independent of host commit. */
export function useMindEditorRecovery(report: (error: unknown) => void, writable: () => boolean) {
  const state = shallowRef<MindMapRecoveryState>({ status: "ready" }), restored = shallowRef(0);
  const blocked = computed(() => ["loading", "recovery", "conflict"].includes(state.value.status));
  let session: MindMapRecoverySession | undefined, generation = 0, cleanup: (() => void) | undefined;
  let current: MindMapEditor | undefined, fields: MindEditorDrafts | undefined;
  /** Captures stable input before its runtime is destroyed, then releases page ownership. */
  function detach(): void { generation++; session?.dispose(); session = undefined; cleanup?.(); cleanup = undefined; current = undefined; fields = undefined; }
  /** @param editor - Raw adapter, not its field-flushing wrapper. @param drafts - Independent property drafts.
   * @param source - Initial host authority. @param title - Initial host title. @param options - Explicit stable scope.
   * @param owner - Mounted browser document. @param admitted - Same workspace after an explicit host save, preserving live input.
   * @returns Storage admission, without committing or reading source on input. */
  async function begin(editor: MindMapEditor, drafts: MindEditorDrafts, source: MindMapDocument, title: string, options: MindEditorRecoveryOptions | undefined, owner: Document, admitted = false): Promise<void> {
    const ticket = generation; current = editor; fields = drafts;
    state.value = { status: options && !admitted ? "loading" : "ready" };
    if (!options) return;
    try {
      const identity = await mindMapRecoveryIdentity(source, title, options);
      if (ticket !== generation) return;
      const factory = owner.defaultView?.indexedDB;
      if (!options.store && !factory) throw new MindMapRecoveryError("draftStorage");
      const next = createMindMapRecoverySession({ ...identity, store: options.store ?? createMindMapRecoveryStore(factory!),
        /** @returns Stable source and literal form fields, never flushing input or history. */
        capture() {
          const document = editor.captureDraft();
          return document ? { document, pending: drafts.snapshot(), selectedId: editor.getState().selectedId } : null;
        },
        /** @param value - Small infrequent storage state. */
        changed(value) {
          if (ticket !== generation) return;
          state.value = value;
          if (value.status === "unavailable") report(value.error instanceof MindMapRecoveryError ? value.error : new MindMapRecoveryError("draftStorage"));
        },
      });
      session = next;
      /** Requests passive checkpoint at browser lifecycle boundaries. */
      function checkpoint(): void { if (owner.hidden) void next.checkpoint(); }
      /** Requests the final stable source before navigation removes the live input. */
      function pagehide(): void { void next.checkpoint(true); }
      owner.addEventListener("visibilitychange", checkpoint); owner.defaultView?.addEventListener("pagehide", pagehide);
      cleanup = () => { owner.removeEventListener("visibilitychange", checkpoint); owner.defaultView?.removeEventListener("pagehide", pagehide); };
      await next.ready;
    } catch (error) { if (ticket === generation) { state.value = { status: "unavailable", error }; report(error); } }
  }
  return {
    state, blocked, restored, begin, detach,
    /** Marks source/field invalidation without reading either. */ change() { session?.change(); },
    /** @returns Removal after explicit host success/cancel, or true when no persistence was enabled. */ finish: () => session?.finish() ?? Promise.resolve(true),
    /** @returns Independent workspace restoration; host permissions remain authoritative. */
    async restore(): Promise<void> {
      const editor = current, drafts = fields, ticket = generation;
      if (!editor || !drafts || !session) return;
      if (!writable()) throw new Error("文档已变为只读，当前草稿未提交。");
      // The recovery modal froze authoring. Temporarily admit only this explicit
      // replacement; reactive permission reconciliation resumes after the decision.
      editor.setReadOnly(false);
      try {
        await session.restore(async checkpoint => {
          await editor.replaceDocument(checkpoint.document);
          if (ticket !== generation) return;
          drafts.hydrate(checkpoint.pending);
          const id = checkpoint.pending.details?.[0]?.ids[0] ?? checkpoint.selectedId;
          if (id) await editor.reveal(id, false);
          await editor.fit();
        });
        if (ticket === generation) restored.value++;
      } finally { if (ticket === generation && blocked.value) editor.setReadOnly(true); }
    },
    /** @returns Explicit candidate removal; a failed comparison retains the other page's record. */ discard: () => session?.discard() ?? Promise.resolve(false),
  };
}
