import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import type { ClassicEditorObjectWorkspaceLayout } from "../../../types/object-workspace";

/**
 * Tracks object-surface layout from the owning Classic root width.
 *
 * @param root - Exact root whose responsive arbitration owns the surface.
 * @returns Reactive wide, compact, or narrow layout.
 */
export function useClassicEditorObjectWorkspaceLayout(
  root: HTMLElement
): Readonly<Ref<ClassicEditorObjectWorkspaceLayout>> {
  const layout = ref<ClassicEditorObjectWorkspaceLayout>(measureLayout(root));
  let observer: ResizeObserver | undefined;

  /** Reprojects one controller without changing its target or action catalog. */
  function measure(): void {
    layout.value = measureLayout(root);
  }

  onMounted(() => {
    measure();
    const view = root.ownerDocument.defaultView;
    if (view?.ResizeObserver === undefined) return;
    observer = new view.ResizeObserver(measure);
    observer.observe(root);
  });
  onBeforeUnmount(() => observer?.disconnect());
  return layout;
}

/** @param root - Owning Classic root. @returns Responsive object layout. */
function measureLayout(root: HTMLElement): ClassicEditorObjectWorkspaceLayout {
  const width = root.getBoundingClientRect().width;
  if (width < 480) return "narrow";
  if (width < 768) return "compact";
  return "wide";
}
