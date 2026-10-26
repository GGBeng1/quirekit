import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import type { MathEditor, MathEditorSnapshot, MathSurfaceRect } from '@quirekit/math';
import { bindMathEditor } from '@quirekit/math/browser';
import type { MathBrowserBinding, MathBrowserSnapshot } from '@quirekit/math/browser';

/**
 * Adapts consumer-painted Vue SVG output to the public framework-independent browser binding.
 * @param editor - Borrowed headless authority.
 * @param surface - Consumer-owned scrollable surface.
 * @param input - Consumer-owned native composition capture.
 * @param graphic - Consumer-owned graphic wrapper.
 * @param suspended - Extra UI ownership such as an open category chooser.
 * @param state - Vue projection of the borrowed core snapshot.
 * @returns Numeric browser facts and native focus restoration.
 */
export function useMathBrowser(editor: () => MathEditor, surface: Ref<HTMLElement | undefined>, input: Ref<HTMLElement | undefined>, graphic: Ref<HTMLElement | undefined>, suspended: () => boolean, state: Ref<MathEditorSnapshot>) {
  const snapshot = shallowRef<MathBrowserSnapshot>({ geometry: [], overlay: { selected: [] }, dragging: false, measurements: 0, pointerUpdates: 0 });
  let binding: MathBrowserBinding | undefined;
  let borrowed: MathEditor | undefined;
  let mounted = false;
  let unsubscribe: (() => void) | undefined;
  /** Confirms identity only after Vue has installed the current headless graphic. */
  function confirm(): void {
    if (!mounted || !surface.value || !input.value) return;
    if (borrowed !== editor()) {
      unsubscribe?.();
      binding?.destroy();
      borrowed = editor();
      binding = bindMathEditor({ editor: borrowed, surface: surface.value, input: input.value, graphic: () => graphic.value?.firstElementChild, suspended });
      snapshot.value = binding.getSnapshot();
      unsubscribe = binding.subscribe(value => { snapshot.value = value; });
    }
    binding?.setRenderedLayout(editor().getSnapshot().presentation.layout);
  }
  // This watch depends on render output identity/readiness, not selection, theme or preedit.
  watch(() => [editor(), state.value.presentation.layout, state.value.presentation.ready] as const, confirm, { flush: 'post' });
  onMounted(() => {
    mounted = true;
    confirm();
  });
  onBeforeUnmount(() => {
    mounted = false;
    unsubscribe?.();
    binding?.destroy();
  });
  /** Restores focus without changing core selection. */
  function focus(): void { binding?.focus(); }
  return { snapshot, focus };
}

/**
 * Converts neutral content pixels into consumer-owned overlay styles.
 * @param rect - Numeric core/browser rectangle.
 * @returns Explicit CSS dimensions, or no decoration.
 */
export function mathRectStyle(rect: MathSurfaceRect | undefined) {
  return rect ? { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` } : undefined;
}
