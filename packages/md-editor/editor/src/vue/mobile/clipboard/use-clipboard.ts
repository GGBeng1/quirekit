import { onBeforeUnmount, shallowRef, watch, type Ref } from "vue";
import type { EditorState } from "@quirekit/cm-state";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { selectionActionsEffect } from "../../../presentation/mobile/actions";
import { captureMobileClipboard } from "./intent";
import { readMobileClipboard, writeMobileClipboard } from "./platform";
import type { MobileClipboardIntent, MobileClipboardResult } from "./types";

/**
 * Owns only the active clipboard request and optional paste draft session.
 * @param editor - Current source instance.
 * @param state - Already accepted product state, without another document subscription.
 * @param enabled - Current mobile task ownership.
 * @returns Clipboard actions and transient presentation state.
 */
export function useMobileClipboard(editor: Readonly<Ref<MsfeEditor>>, state: Readonly<Ref<EditorState>>, enabled: Readonly<Ref<boolean>>) {
  const busy = shallowRef(false), fallback = shallowRef(false), error = shallowRef<"" | "failed" | "empty">("");
  let active: MobileClipboardIntent | null = null;
  /** Drops stale completions and releases the one source anchor before abort callbacks run. */
  function cancel(): void {
    const previous = active; active = null; busy.value = false; fallback.value = false; previous?.release();
  }
  /** @param visible - Explicit menu intent, with no source, focus or history change. */
  function show(visible: boolean): void { editor.value.updateViewState({ effects: [selectionActionsEffect.of(visible)] }); }
  /** @param result - Outcome for an intent proven current immediately before this call. */
  function feedback(result: MobileClipboardResult): void {
    if (result === "conflict") { cancel(); return; }
    if (result === "accepted") { cancel(); show(false); return; }
    error.value = result;
    if (!fallback.value) { cancel(); show(true); }
  }
  /** @param text - Dedicated fallback draft or just-read system text. */
  function paste(text: string): void {
    if (!active?.current()) { cancel(); return; }
    feedback(active.paste(text));
  }
  /** @param action - A single explicit Toolbar activation. @returns Completion or admission of the manual paste form. */
  async function execute(action: string): Promise<void> {
    if (!enabled.value || busy.value || fallback.value || !["copy", "cut", "paste"].includes(action)) return;
    if (action !== "copy" && (editor.value.state.readOnly || editor.value.mode === "locked")) return;
    cancel(); error.value = "";
    const owner = editor.value, intent = captureMobileClipboard(owner);
    if (!intent.current()) { intent.release(); return; }
    active = intent; busy.value = true; show(false);
    if (action === "paste") {
      let text: string;
      try { text = await readMobileClipboard(owner.element.ownerDocument); }
      catch {
        if (active === intent && intent.current()) { busy.value = false; fallback.value = true; }
        else if (active === intent) cancel();
        return;
      }
      if (active !== intent) return;
      busy.value = false; paste(text);
    } else {
      const result = await intent.copy(action === "cut", source => writeMobileClipboard(owner.element.ownerDocument, source));
      if (active !== intent) return;
      busy.value = false; feedback(result);
    }
  }
  // Only an active request validates source state. Closed menus add no text,
  // clipboard or geometry reads to ordinary typing and selection transactions.
  watch([editor, state, enabled], () => {
    if (!enabled.value || active && !active.current()) { error.value = ""; cancel(); }
  }, { flush: "sync" });
  watch([editor, () => state.value.doc, () => state.value.selection, () => state.value.readOnly], () => { error.value = ""; }, { flush: "sync" });
  onBeforeUnmount(cancel);
  return { busy, fallback, error, execute, paste, cancel };
}
