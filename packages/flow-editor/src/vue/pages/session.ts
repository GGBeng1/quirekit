import { onBeforeUnmount, shallowRef, watch, type Ref } from "vue";
import type { FlowchartPageSettings } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowPageRequest } from "./types";

/** @param editor - Current host controller. @param version - Source invalidation sequence. @returns Frozen page-dialog capture and guarded persistence. */
export function useFlowPageDialog(editor: Ref<FlowchartEditor | undefined>, version: Ref<number>) {
  const request = shallowRef<FlowPageRequest>(); let lifetime: AbortController | undefined, generation = 0;
  /** Revokes asynchronous preparation immediately, independently of popup presence animations. */
  function close(): void { generation++; lifetime?.abort(); lifetime = undefined; request.value = undefined; }
  watch([editor, version], close, { flush: "sync" }); onBeforeUnmount(close);
  /** @returns Completion of source capture, available for read-only printing. */
  async function open(): Promise<void> {
    const owner = editor.value; if (!owner || owner.getState().composing) return;
    close();
    // Commit native text before recording the source generation; later changes still revoke this capture.
    const pending = owner.getDocument(), ticket = generation, captured = version.value;
    const source = await pending;
    if (ticket !== generation) return;
    if (owner !== editor.value || captured !== version.value) throw new Error("编辑目标已改变，请重新打开");
    lifetime = new AbortController(); request.value = { editor: owner, document: source, ids: [], version: captured, format: "svg", signal: lifetime.signal };
  }
  /** @param settings - Complete explicit physical draft. */
  function apply(settings: FlowchartPageSettings): void {
    const task = request.value, owner = editor.value;
    if (!task || task.editor !== owner || task.version !== version.value || owner.getState().readOnly || owner.getState().composing) throw new Error("编辑目标已改变，请重新打开");
    owner.setPage(settings, task.document);
  }
  return { request, open, apply, close };
}
