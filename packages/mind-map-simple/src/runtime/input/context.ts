import type { SimpleInstance } from "../../vendor/types";
import { setMindMapSelection } from "../../vendor/selection";

/**
 * Gives a context action a stable selection while leaving native text menus to the browser.
 * @param instance - Live renderer.
 * @param mount - Instance-owned surface.
 * @param target - Context event target, or a surrounding keyboard context region.
 * @returns Whether a canvas menu may open.
 */
export function selectMindMapContextTarget(instance: SimpleInstance, mount: HTMLElement, target: EventTarget | null): boolean {
  if (!(target instanceof Element) || target.closest("[contenteditable],input,textarea")) return false;
  // A keyboard context trigger lies outside the mount and keeps the current selection.
  if (!mount.contains(target)) return true;
  instance.renderer.textEdit.hideEditTextBox();
  const group = target.closest(".smm-node");
  const node = group ? Object.values(instance.renderer.nodeCache).find(item => item.group?.node === group) : undefined;
  if (!node) setMindMapSelection(instance, []);
  else if (!instance.renderer.activeNodeList.includes(node)) setMindMapSelection(instance, [node]);
  return true;
}
