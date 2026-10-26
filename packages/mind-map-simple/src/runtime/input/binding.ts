import type { MindMapEditorCommand } from "../../types";
import type { SimpleInstance } from "../../vendor/types";
import type { MindMapInputBinding } from "../types";
import { navigateMindMap } from "./navigation";
import { bindMindMapIme } from "./ime";

/**
 * Routes keyboard input only within this surface; upstream global shortcuts are disabled.
 * @param mount - Instance-owned focus and overlay boundary.
 * @param instance - Internal vendor instance.
 * @param execute - Admitted command dispatcher.
 * @param reportError - Event-command error sink.
 * @param readOnly - Whether editing gestures must remain disabled.
 * @param stateChanged - Composition availability notification.
 * @param busy - Pending structure or layout work.
 * @param cancel - Pointer gesture cancellation before keyboard selection.
 * @param draftChanged - Optional constant-work native input invalidation.
 * @returns Listener ownership and composition state.
 */
export function bindMindMapInput(mount: HTMLElement, instance: SimpleInstance,
  execute: (command: MindMapEditorCommand) => Promise<void>, reportError: (error: unknown) => void,
  readOnly: () => boolean, stateChanged: () => void, busy: () => boolean, cancel: () => void, draftChanged?: () => void): MindMapInputBinding {
  const ime = bindMindMapIme(mount, stateChanged);
  /** @param event - Editing event that must not reach the surrounding editor. */
  function stopBubbling(event: Event): void { event.stopPropagation(); }
  /** Observes native input before the vendor stops bubbling; leaves its default text/undo lifecycle intact. */
  function draftInput(): void { draftChanged?.(); }
  /** @param event - Pointer event whose focus belongs to this surface. */
  function focus(event: PointerEvent): void {
    if (!ime.isComposing() && !(event.target as Element).closest("[contenteditable],input,textarea,button")) mount.focus({ preventScroll: true });
  }
  /** @param event - Keyboard event originating inside the owned surface. */
  function keydown(event: KeyboardEvent): void {
    if ((event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) && !ime.isComposing()
      && !(event.target as Element).closest("[contenteditable]")) return;
    // The outer document editor must not interpret keys used by its embedded editor.
    // Keep native text editing intact; only plain Enter commits the text overlay.
    event.stopPropagation();
    if (ime.handleKey(event)) return;
    if ((event.target as Element).closest("[contenteditable]")) {
      if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); instance.renderer.textEdit.hideEditTextBox(); mount.focus({ preventScroll: true });
      }
      return;
    }
    if (busy() && !(event.altKey && event.shiftKey) && (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "Escape"].includes(event.key)
      || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a"))) { event.preventDefault(); return; }
    if (navigateMindMap(instance, event, cancel)) return;
    if (readOnly()) return;
    let command: MindMapEditorCommand | undefined;
    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === "z") command = event.shiftKey ? "redo" : "undo";
      if (event.key.toLowerCase() === "y") command = "redo";
    } else if (event.altKey && event.shiftKey) {
      const commands: Record<string, MindMapEditorCommand> = { ArrowUp: "move-up", ArrowDown: "move-down", ArrowLeft: "outdent", ArrowRight: "indent" };
      command = commands[event.key];
    } else if (!event.altKey && event.shiftKey) {
      if (event.key === "Tab") command = "outdent";
      if (event.key === "Enter") command = "add-parent";
    } else if (!event.altKey && !event.shiftKey) {
      const commands: Record<string, MindMapEditorCommand> = {
        Tab: "add-child", Enter: "add-sibling", Delete: "remove", Backspace: "remove", "/": "toggle-collapse", F2: "edit-text",
      };
      command = commands[event.key];
    }
    if (command) { event.preventDefault(); void execute(command).catch(reportError); }
  }
  mount.addEventListener("pointerdown", focus);
  mount.addEventListener("keydown", keydown, true);
  if (draftChanged) mount.addEventListener("input", draftInput, true);
  const localEvents = ["input", "beforeinput", "paste", "copy", "cut", "keyup"];
  localEvents.forEach(event => mount.addEventListener(event, stopBubbling));
  return {
    /** @returns Whether this surface owns a pending composition. */
    isComposing: ime.isComposing,
    /** Removes instance-owned listeners without changing document content. */
    dispose() {
      mount.removeEventListener("pointerdown", focus);
      mount.removeEventListener("keydown", keydown, true);
      if (draftChanged) mount.removeEventListener("input", draftInput, true);
      ime.dispose();
      localEvents.forEach(event => mount.removeEventListener(event, stopBubbling));
    },
  };
}
