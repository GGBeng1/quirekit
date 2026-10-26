import { createApp, shallowRef } from "vue";
import { createMindMapDocument, type MindMapDocument } from "@quirekit/mind-map";
import type { MindEditorHandle } from "@quirekit/mind-editor/vue";
import { mindMapRecoveryIdentity, type MindMapRecoveryRecord, type MindMapRecoveryStore } from "../../src/index";
import type { SaveAcceptanceBridge } from "./types";
import SaveAcceptanceFixture from "./scenario.vue";

/** @returns A real component with a public host save and a controllable atomic store. */
export async function mountSaveAcceptance(): Promise<SaveAcceptanceBridge> {
  const document = createMindMapDocument({ text: "保存起点", children: [] });
  const editor = shallowRef<MindEditorHandle>();
  const errors: string[] = [];
  let record: MindMapRecoveryRecord | null = null, accepted: MindMapDocument | null = null;
  let removing = false, finished = false, release: (() => void) | undefined, expectedBase: string | null = null;
  const store: MindMapRecoveryStore = {
    /** @param _key - Test task identity. @returns Stored checkpoint. */
    async load(_key) { return record; },
    /** @param _key - Test slot. @param expected - Observed token. @param next - Passive checkpoint. @returns Atomic comparison success. */
    async save(_key, expected, next) {
      if ((record?.token ?? null) !== expected) return false;
      record = next; return true;
    },
    /** @param _key - Test slot. @param expected - Observed token. @returns Delayed atomic deletion success. */
    async remove(_key, expected) {
      removing = true;
      await new Promise<void>(resolve => { release = resolve; });
      if (record?.token !== expected) return false;
      record = null; return true;
    },
  };
  const recovery = { namespace: "save-acceptance", documentId: "doc", targetId: "standalone", store };
  const host = window.document.createElement("div"); host.id = "save-acceptance";
  Object.assign(host.style, { position: "fixed", inset: "0", zIndex: "100", background: "white" });
  window.document.body.append(host);
  let initialized: (() => void) | undefined;
  const ready = new Promise<void>(resolve => { initialized = resolve; });
  // The fixture exercises the same component/host contract as standalone consumers.
  // Storage delay exposes late input without patching IndexedDB or the vendor runtime.
  createApp(SaveAcceptanceFixture, { source: document, recovery,
    /** @param handle - Ready public component reference. */
    onReady(handle: MindEditorHandle) { editor.value = handle; initialized?.(); },
    /** @param error - Public component failure. */
    onError(error: unknown) { errors.push(String(error)); },
  }).mount(host);
  await ready;
  /** @returns A host snapshot, before the host's asynchronous save response. */
  async function capture(): Promise<void> {
    accepted = await editor.value!.getDocument();
    expectedBase = (await mindMapRecoveryIdentity(accepted, "保存起点", recovery)).base;
  }
  /** @returns Host acceptance of the captured source, preserving later input. */
  async function accept(): Promise<void> {
    try {
      await editor.value!.acceptRecoverySave(accepted!);
      finished = true;
    } catch (error) { errors.push(String(error)); }
  }
  return {
    /** @returns Explicit host/storage observations, never the editor's private state. */
    state: () => ({ removing, finished, accepted, record, expectedBase, errors: [...errors] }),
    capture,
    /** Accepts the immutable host snapshot without capturing subsequent input. */
    accept() { void accept(); },
    /** Starts host save without making the browser wait before sending late input. */
    save() { void capture().then(accept).catch(error => errors.push(String(error))); },
    /** Releases only this fixture's storage delay. */
    release() { release?.(); },
  };
}
