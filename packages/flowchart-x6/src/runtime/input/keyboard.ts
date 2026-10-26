import type { FlowchartEditor } from "../../types";
import type { FlowRuntime, FlowTextInput } from "../types";

/** @param runtime - Isolated canvas. @param text - Native editing owner. @param controller - Guarded commands. @returns Listener cleanup, including an unfinished key-repeat history batch. */
export function bindKeyboard(runtime: FlowRuntime, text: FlowTextInput, controller: FlowchartEditor): () => void {
  const { graph, mount } = runtime;
  let repeating = false;
  /** Closes repeat history before focus, selection or another command takes ownership. */
  function finish(): void { if (repeating) { repeating = false; graph.stopBatch("keyboard-move"); } }
  /** @param event - Native key owned by this instance. */
  function keydown(event: KeyboardEvent): void {
    if ((event.target as HTMLElement).closest("textarea,input,[contenteditable=true]") || event.isComposing || event.keyCode === 229 || text.isComposing()) { finish(); return; }
    const mod = event.ctrlKey || event.metaKey, key = event.key.toLowerCase();
    if (runtime.presenting && !(mod && key === "a")) {
      const player = controller.playback, run = player.getState();
      if (!mod && !event.altKey && [" ", "arrowright", "arrowleft", "home", "end", "escape"].includes(key)) {
        event.preventDefault(); event.stopPropagation();
        if (key === " ") { if (run.status === "playing" || run.status === "waiting") player.pause(); else player.play(); }
        else if (key === "arrowright") player.step();
        else if (key === "arrowleft") player.seek(Math.max(0, run.index - 1));
        else if (key === "home") player.seek(0); else if (key === "end") player.seek(run.count); else player.close();
      } else if (["delete", "backspace", "f2"].includes(key) || mod && ["z", "y", "d", "g"].includes(key)) { event.preventDefault(); event.stopPropagation(); }
      finish(); return;
    }
    const arrow = ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key) && !mod && !event.altKey;
    if (arrow && graph.getSelectedCells().length) {
      event.preventDefault(); event.stopPropagation();
      if (runtime.readOnly || runtime.dragging || runtime.exporting) { finish(); return; }
      if (!repeating) { graph.startBatch("keyboard-move"); repeating = true; }
      const step = event.shiftKey ? 10 : 1;
      try { controller.moveSelection({ x: key === "arrowleft" ? -step : key === "arrowright" ? step : 0, y: key === "arrowup" ? -step : key === "arrowdown" ? step : 0 }); }
      catch (error) { finish(); runtime.fail(error); }
      return;
    }
    finish();
    const command = mod && key === "z" ? event.shiftKey ? "redo" : "undo" : mod && key === "y" ? "redo"
      : mod && key === "g" ? event.shiftKey ? "ungroup" : "group" : mod && key === "d" ? "duplicate" : mod && key === "a" ? "select-all" : key === "f2" ? "edit-text"
      : key === "delete" || key === "backspace" ? "delete" : undefined;
    if (!command) return;
    event.preventDefault(); event.stopPropagation();
    if (runtime.readOnly && command !== "select-all") return;
    try { controller.execute(command); } catch (error) { runtime.fail(error); }
  }
  mount.addEventListener("keydown", keydown); mount.addEventListener("keyup", finish);
  mount.addEventListener("blur", finish); mount.addEventListener("pointerdown", finish, true);
  graph.on("selection:changed", finish);
  return () => {
    finish(); graph.off("selection:changed", finish); mount.removeEventListener("keydown", keydown);
    mount.removeEventListener("keyup", finish); mount.removeEventListener("blur", finish); mount.removeEventListener("pointerdown", finish, true);
  };
}
