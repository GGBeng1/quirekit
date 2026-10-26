import { shallowRef, watch, type Ref } from "vue";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowExportRequest } from "./types";
/** @param editor - Live host controller. @param version - Current source invalidation. @returns Guarded explicit opening and revocable dialog state. */
export function useFlowExportDialog(editor: Ref<FlowchartEditor | undefined>, version: Ref<number>) {
  const request = shallowRef<FlowExportRequest>();
  watch([editor, version], () => { request.value = undefined; }, { flush: "sync" });
  /** @param format - Initial file choice. @returns Completion of the opening source snapshot. */
  async function open(format: "svg" | "png"): Promise<void> {
    const owner = editor.value; if (!owner) return;
    const source = await owner.getDocument();
    if (owner !== editor.value) return;
    request.value = { editor: owner, document: source, ids: [...owner.getState().selectedIds], version: version.value, format };
  }
  return { request, open };
}
