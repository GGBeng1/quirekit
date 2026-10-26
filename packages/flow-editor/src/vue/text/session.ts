import { shallowRef, type Ref } from "vue";
import { canFormatFlowchartText, type FlowchartTextSpan } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowTextRequest } from "./types";

/** @param editor - Current controller. @param version - Content invalidation. @returns Atomic guarded partial-caption dialog. */
export function useFlowTextDialog(editor: Ref<FlowchartEditor | undefined>, version: Ref<number>) {
  const request = shallowRef<FlowTextRequest>();
  /** @returns Completion of source capture; ordinary selection notifications do not read full source. */
  async function open(): Promise<void> {
    const owner = editor.value, state = owner?.getState();
    if (!owner || !state || state.readOnly || state.composing || state.selectionLocked || state.selectedIds.length !== 1) return;
    const captured = version.value, id = state.selectedIds[0], source = await owner.getDocument();
    if (owner !== editor.value || captured !== version.value || owner.getState().selectedIds[0] !== id) throw new Error("编辑目标已改变，请重新打开");
    const node = source.nodes.find(item => item.id === id);
    if (!node || !canFormatFlowchartText(node)) throw new Error("请选择普通文字节点");
    request.value = { owner, version: captured, node };
  }
  /** @param text - Draft text. @param spans - Draft ranges. Confirms once against the same source owner and selection. */
  function apply(text: string, spans: readonly FlowchartTextSpan[]): void {
    const task = request.value, owner = editor.value, state = owner?.getState();
    if (!task || owner !== task.owner || task.version !== version.value || !state || state.readOnly || state.composing || state.selectionLocked || state.selectedIds.length !== 1 || state.selectedIds[0] !== task.node.id) throw new Error("编辑目标已改变，请重新打开");
    owner.setTextContent(task.node.id, text, spans, task.node);
  }
  return { request, open, apply };
}
