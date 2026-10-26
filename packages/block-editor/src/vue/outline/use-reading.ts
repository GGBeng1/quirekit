import { onBeforeUnmount, shallowRef, watch, type Ref } from "vue";
import type { Editor } from "@quirekit/core";
import { createReadingOutline } from "../../ui/outline/reading";
import type { ReadingOutlineController } from "../../ui/outline/types";
import type { BlockOutlineEntry } from "../../ui/state/types";

/**
 * Subscribes only while the reading outline is visible in a mounted workspace.
 * @param editor - Canonical editor session.
 * @param viewport - Product-owned scroll container.
 * @param headings - Incremental semantic heading projection.
 * @param enabled - Reading mode with a visible outline.
 * @returns Current reading chapter and explicit scroll navigation.
 */
export function useReadingOutline(editor: Editor, viewport: Ref<HTMLElement | undefined>,
  headings: Ref<readonly BlockOutlineEntry[]>, enabled: Ref<boolean>) {
  const current = shallowRef<number>();
  let controller: ReadingOutlineController | undefined;
  /** Releases geometry subscriptions before the View or reading mode disappears. */
  function release(): void { controller?.destroy(); controller = undefined; current.value = undefined; }
  /** Binds the current mount only when the outline actually consumes scroll position. */
  function bind(): void {
    release();
    if (!enabled.value || !viewport.value || !editor.mountedView) return;
    controller = createReadingOutline({ editor, viewport: viewport.value, headings: () => headings.value,
      activate: pos => { current.value = pos; } });
  }
  watch([enabled, viewport], bind, { flush: "post", immediate: true });
  watch(headings, () => controller?.refresh(), { flush: "post" });
  editor.on("mount", bind); editor.on("unmount", release);
  onBeforeUnmount(() => { release(); editor.off("mount", bind); editor.off("unmount", release); });
  /** @param pos - Current heading selected from the reading outline. */
  function navigate(pos: number): void { controller?.navigate(pos); }
  return { current, navigate };
}
