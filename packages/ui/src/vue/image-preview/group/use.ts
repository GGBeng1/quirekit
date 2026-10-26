import { computed, ref, shallowRef, watch } from "vue";
import type { QuireKitImagePreviewOptions } from "../types";
import type { ImagePreviewGroupMember, ImagePreviewGroupState } from "./types";

/**
 * Collects explicitly registered images without observing or scanning the document.
 * @param accepts - Container boundary check, evaluated only when preparing an open group.
 * @returns State consumed by the existing ImagePreview component.
 */
export function useImagePreviewGroup(accepts: (element: HTMLElement) => boolean): ImagePreviewGroupState {
  const members = shallowRef<readonly ImagePreviewGroupMember[]>([]);
  const ordered = shallowRef<readonly ImagePreviewGroupMember[]>([]);
  const opened = ref(false);
  const activeId = ref("");
  const opener = shallowRef<HTMLElement | null>(null);
  const options = shallowRef<QuireKitImagePreviewOptions>();
  const eligible = computed(() => members.value.filter(member => member.enabled.value));
  const items = computed(() => ordered.value.filter(member => member.enabled.value).map(member => ({ ...member.item.value, id: member.id })));
  const index = computed({
    get: () => Math.max(0, items.value.findIndex(item => item.id === activeId.value)),
    set: (value: number) => { const item = items.value[value]; if (item) activeId.value = item.id; }
  });

  /** Orders the current eligible members at open or membership-change boundaries. */
  function refresh(): void {
    ordered.value = eligible.value.filter(member => member.element.value && accepts(member.element.value)).sort((a, b) => {
      const relation = a.element.value!.compareDocumentPosition(b.element.value!);
      return relation & 4 ? -1 : relation & 2 ? 1 : 0;
    });
  }
  /** @param member - Mounted resource owner. @returns Unregister callback tied to its lifecycle. */
  function register(member: ImagePreviewGroupMember): () => void {
    members.value = [...members.value, member];
    return () => {
      ordered.value = ordered.value.filter(current => current !== member);
      members.value = members.value.filter(current => current !== member);
    };
  }
  /** @param id - Requested member. @param trigger - Original image button. @param overrides - Image-specific options. @returns Whether this container owns the requested image. */
  function open(id: string, trigger: HTMLElement, overrides?: QuireKitImagePreviewOptions): boolean {
    refresh();
    if (!items.value.some(item => item.id === id)) return false;
    activeId.value = id;
    opener.value = trigger;
    options.value = overrides;
    opened.value = true;
    return true;
  }
  // Resource metadata stays reactive without DOM reads. Only changes to membership
  // reorder an already-open group; navigation and transform gestures never do so.
  watch(eligible, () => { if (opened.value) refresh(); }, { flush: "post" });
  watch(items, (next, previous) => {
    if (!opened.value) return;
    if (!next.length) { opened.value = false; return; }
    if (!next.some(item => item.id === activeId.value)) {
      const previousIndex = Math.max(0, previous.findIndex(item => item.id === activeId.value));
      activeId.value = next[Math.min(previousIndex, next.length - 1)]!.id;
    }
  }, { flush: "sync" });
  /** @returns Original trigger when it remains connected to its document. */
  function finalFocusEl(): HTMLElement | null { return opener.value?.isConnected ? opener.value : null; }
  return { context: { register, open }, refresh, items, opened, index, options, finalFocusEl };
}
