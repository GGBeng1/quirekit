import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

/**
 * Tracks the owning editor root rather than the global page viewport.
 *
 * @param resolveRoot - Current mounted Classic root resolver.
 * @returns Whether the root uses the 720/390 searchable Sheet recipe.
 */
export function useClassicEditorInsertCompactLayout(
  resolveRoot: () => HTMLElement
): Readonly<Ref<boolean>> {
  const compact = ref(false);
  let observer: ResizeObserver | undefined;

  /** Updates the responsive recipe from one measured root width. */
  function measure(): void {
    compact.value = resolveRoot().getBoundingClientRect().width < 768;
  }

  onMounted(() => {
    measure();
    const view = resolveRoot().ownerDocument.defaultView;
    if (view?.ResizeObserver === undefined) return;
    observer = new view.ResizeObserver(measure);
    observer.observe(resolveRoot());
  });
  onBeforeUnmount(() => observer?.disconnect());
  return compact;
}
