import type { MindMapEditorCommand } from "../../types";
import type { MindMapStructureCommand } from "@quirekit/mind-map";
import type { MindMapCommandContext } from "./types";
import { mindMapStructureState } from "./state";
import { settleMindMapLayout } from "../layout";
import { setMindMapSelection } from "../../vendor/selection";

/** @param context - Instance-owned command authorities. @returns Serialized-intent implementation. */
export function createMindMapCommandHandler(context: MindMapCommandContext) {
  const { instance, structure, assertWritable, assertActive, cancel } = context;
  /** @param command - Admitted command. @returns Layout completion. */
  return async function applyCommand(command: MindMapEditorCommand): Promise<void> {
    assertWritable();
    const node = instance.renderer.activeNodeList[0];
    const nodes = [...instance.renderer.activeNodeList];
    cancel();
    if (Object.hasOwn(mindMapStructureState(instance), command)) {
      await structure.edit(command as MindMapStructureCommand, nodes.map(item => String(item.getData("uid")))); return;
    }
    if (command === "add-free") {
      const root = instance.renderer.root, { x, y, scale } = instance.view;
      await structure.add({ x: (instance.width / 2 - x) / scale - root.left,
        y: (instance.height * 0.75 - y) / scale - root.top }); return;
    }
    if (command === "remove") { await structure.remove(nodes.map(item => String(item.getData("uid")))); return; }
    if (!["undo", "redo"].includes(command) && nodes.length !== 1) return;
    if (command === "add-sibling" && node?.getData("_quirekitFree")) {
      await structure.add({ x: node.left - instance.renderer.root.left, y: node.top - instance.renderer.root.top + node.height + 48 }); return;
    }
    if (command === "edit-text") {
      if (node) await instance.renderer.textEdit.show({ node });
      return;
    }
    instance.renderer.textEdit.hideEditTextBox();
    // Flush the preceding edit before undo. This avoids upstream's delayed history
    // collection merging a programmatic edit with a subsequent command.
    instance.command.originAddHistory();
    if (command === "undo" || command === "redo") instance.execCommand(command === "undo" ? "BACK" : "FORWARD");
    else if (node) {
      if (command === "add-child") instance.execCommand("INSERT_CHILD_NODE", false, [node]);
      else if (command === "add-sibling") instance.execCommand("INSERT_NODE", false, [node]);
      else if (command === "toggle-collapse" && !node.isRoot) instance.execCommand("SET_NODE_EXPAND", node, !node.getData("expand"));
    }
    await settleMindMapLayout(instance); assertActive();
    if (command === "undo" || command === "redo") {
      setMindMapSelection(instance, nodes.flatMap(previous => {
        const current = instance.renderer.findNodeByUid(String(previous.getData("uid"))); return current ? [current] : [];
      }));
    }
    instance.command.originAddHistory();
  }
}
