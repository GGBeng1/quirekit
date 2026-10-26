import type { MindMapEditor } from "../../types";
import type { MindMapCommandContext } from "./types";
import type { createMindMapQueue } from "../queue";
import { readSimpleOutline } from "../outline/query";
import { selectMindMapContextTarget } from "../input/context";
import { revealMindMapGeometry } from "../input/navigation";
import { setMindMapSelection } from "../../vendor/selection";

/**
 * Keeps explicit navigation and its lazy outline outside source mutation subscriptions.
 * @param context - Lifetime, geometry and folding authorities.
 * @param queue - Serialized commands.
 * @param mount - Instance-local keyboard owner.
 * @param version - Constant-sized source generation.
 * @param blocked - Closed, composing or queued session.
 * @param readOnly - Current permission rather than the initial host option.
 * @returns Explicit selection and outline operations.
 */
export function createMindMapNavigation(context: MindMapCommandContext, queue: ReturnType<typeof createMindMapQueue>,
  mount: HTMLElement, version: () => number, blocked: () => boolean, readOnly: () => boolean):
  Pick<MindMapEditor, "getOutline" | "reveal" | "prepareContextMenu" | "select"> {
  const { instance, structure, assertActive, cancel } = context;
  let outline: { version: number; entries: ReturnType<typeof readSimpleOutline> } | undefined;
  return {
    /** @returns One cached index per accepted source generation. */
    getOutline() {
      assertActive();
      if (!outline || outline.version !== version()) outline = { version: version(), entries: readSimpleOutline(instance.renderer.renderTree) };
      return outline.entries;
    },
    /** @param id - Topic to reveal. @param focus - Whether canvas focus follows. @returns Whether it exists and is visible. */
    reveal: (id, focus = true) => queue.run(async () => {
      assertActive(); cancel(); let node = instance.renderer.findNodeByUid(id);
      if (!node) {
        if (readOnly() || !await structure.reveal(id)) return false;
        assertActive(); node = instance.renderer.findNodeByUid(id);
      }
      if (!node) return false;
      instance.renderer.textEdit.hideEditTextBox(); setMindMapSelection(instance, [node]); revealMindMapGeometry(instance, node);
      if (focus) mount.focus({ preventScroll: true }); return true;
    }),
    /** @param target - Context event origin. @returns Whether this surface owns the menu request. */
    prepareContextMenu(target) {
      if (blocked()) return false; cancel(); return selectMindMapContextTarget(instance, mount, target);
    },
    /** @param id - Visible topic id. @param focus - Whether canvas focus follows. @returns Whether selection succeeded. */
    select(id, focus = true) {
      assertActive(); if (queue.busy()) return false;
      const node = instance.renderer.findNodeByUid(id); if (!node) return false;
      instance.renderer.textEdit.hideEditTextBox(); setMindMapSelection(instance, [node]);
      if (focus) mount.focus({ preventScroll: true }); return true;
    },
  };
}
