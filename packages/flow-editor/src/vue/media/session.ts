import { shallowRef, type Ref } from "vue";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowchartImage } from "@quirekit/flowchart";
import type { FlowMediaRequest } from "./types";

/** @param editor - Current controller. @param version - Content invalidation owner. @returns Captured insertion/replacement and explicit guarded apply. */
export function useFlowMediaDialog(editor: Ref<FlowchartEditor | undefined>, version: Ref<number>) {
  const request = shallowRef<FlowMediaRequest>();
  /** @param tab - Initial task tab. @param replace - Whether to capture one selected image. @returns Completion of source capture. */
  async function open(tab: "upload" | "icons", replace = false): Promise<void> {
    const owner = editor.value; if (!owner || owner.getState().readOnly || owner.getState().composing) return;
    const captured = version.value, state = owner.getState();
    const document = replace ? await owner.getDocument() : undefined;
    if (owner !== editor.value || captured !== version.value) throw new Error("编辑目标已改变，请重新打开");
    const node = document?.nodes.find(n => n.id === state.selectedIds[0]);
    if (replace && (!node?.image || state.selectedIds.length !== 1 || state.selectionLocked)) throw new Error("请选择图片节点");
    request.value = { owner, version: captured, tab, ...(node ? { node } : {}) };
  }
  /** @param image - Valid completed resource. Applies once to the source owner, never to a late replacement instance. */
  function apply(image: FlowchartImage): void {
    const task = request.value, owner = editor.value;
    if (!task || owner !== task.owner || task.version !== version.value || owner.getState().readOnly || owner.getState().composing) throw new Error("编辑目标已改变，请重新打开");
    if (task.node) {
      if (owner.getState().selectedIds.length !== 1 || owner.getState().selectedIds[0] !== task.node.id) throw new Error("编辑目标已改变，请重新打开");
      owner.setImage(task.node.id, image, task.node);
    } else owner.addImage(image);
  }
  return { request, open, apply };
}
