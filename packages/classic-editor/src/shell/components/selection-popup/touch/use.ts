import { onBeforeUnmount, watch } from "vue";
import type { ClassicEditorSelectionPopupProps } from "../types";
import { bindSelectedTextTap } from "./tap";

/**
 * Binds mobile tap ownership only while a compact editor is mounted.
 * @param props - Current shell and root identities.
 * @param isVisible - Toolbar visibility before outside dismissal.
 * @param toggle - Applies an accepted tap's visibility.
 * @returns One-shot guard preventing pointer settlement from overriding the tap.
 */
export function useSelectionPopupTouch(props: Readonly<ClassicEditorSelectionPopupProps>,
  isVisible: () => boolean, toggle: (visible: boolean) => void): () => boolean {
  let handled = false;
  let release: (() => void) | undefined;
  watch(() => [props.root, props.model.compact, props.model.context?.editor] as const, ([root, compact, editor]) => {
    release?.();
    release = undefined;
    handled = false;
    if (root && compact && editor) release = bindSelectedTextTap({ root, editor, isVisible,
      toggle: visible => { handled = true; toggle(visible); } });
  }, { immediate: true });
  onBeforeUnmount(() => release?.());
  return () => { const consumed = handled; handled = false; return consumed; };
}
