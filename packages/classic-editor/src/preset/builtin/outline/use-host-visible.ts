import { getCurrentInstance, onBeforeUnmount, onMounted, ref, type Ref } from "vue";

/**
 * Tracks whether the outline panel host has a size; a collapsed sidebar keeps the panel mounted
 * inside a zero-size host.
 *
 * Observes the stable host rather than the component root, which switches between the tree and
 * the empty state.
 *
 * @returns Visibility, true until a size is observed and where ResizeObserver is unavailable.
 */
export function useClassicEditorOutlineHostVisible(): Readonly<Ref<boolean>> {
  const visible = ref(true);
  const instance = getCurrentInstance();
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(([entry]) => {
    visible.value = entry === undefined || entry.contentRect.width > 0 || entry.contentRect.height > 0;
  });
  onMounted(() => {
    const root: unknown = instance?.proxy?.$el;
    const host = root instanceof Node ? root.parentElement : null;
    if (host !== null) observer?.observe(host);
  });
  onBeforeUnmount(() => observer?.disconnect());
  return visible;
}
