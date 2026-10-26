<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import type { QuireKitTreeNode } from '../../components/tree-view';
import CascaderLevel from './level.vue';
import CascaderFlyout from './flyout.vue';

/** Hierarchy presentation: one root level and independently anchored descendants. */
interface Props {
  /** Field accessible name. */
  readonly label: string;
  /** Prepared hierarchy with disabled ancestry. */
  readonly nodes: readonly QuireKitTreeNode[];
  /** Last committed terminal id. */
  readonly selected?: string | undefined;
  /** Whether pointer hover previews branches. */
  readonly expandTrigger: 'hover' | 'click';
}
const props = defineProps<Props>();
const browsing = defineModel<string[]>({ required: true });
const emit = defineEmits<{ /** Commits a terminal node only. */ choose: [id: string] }>();
const root = ref<HTMLElement>();
const anchors = shallowRef<Array<HTMLElement | undefined>>([]);
let pending: ReturnType<typeof setTimeout> | undefined;
let pendingKey = '';
const levels = computed(() => {
  const result = [props.nodes];
  let siblings = props.nodes;
  for (const id of browsing.value) {
    const children = siblings.find(node => node.id === id && !node.disabled)?.children;
    if (!children?.length) break;
    result.push(children); siblings = children;
  }
  return result;
});
/** Cancels a pending sibling preview without closing the current child. */
function cancelHover(): void { clearTimeout(pending); pending = undefined; pendingKey = ''; }
onBeforeUnmount(cancelHover);
/** @param level - Parent level. @param id - Branch or leaf being previewed. */
function preview(level: number, id: string): void {
  if (!levels.value[level]?.some(node => node.id === id && !node.disabled)) return;
  browsing.value = [...browsing.value.slice(0, level), id];
}
/** @param level - Parent level. @param id - Pointer candidate, distinct from selection. */
function hover(level: number, id: string): void {
  if (props.expandTrigger !== 'hover') return;
  if (browsing.value[level] === id) { cancelHover(); return; }
  if (pendingKey === `${level}:${id}`) return;
  cancelHover(); pendingKey = `${level}:${id}`;
  pending = setTimeout(() => { preview(level, id); cancelHover(); }, 140);
}
/** @param level - Activated level. @param id - Click or keyboard candidate. */
function select(level: number, id: string): void {
  cancelHover(); preview(level, id);
  const node = levels.value[level]?.find(node => node.id === id && !node.disabled);
  if (node && !node.children?.length && !node.childrenCount) emit('choose', id);
}
/** @param level - Mounted list depth. @returns Its Listbox focus owner. */
function listAt(level: number): HTMLElement | undefined {
  return root.value?.querySelector<HTMLElement>(`[data-cascader-level="${level}"] [role="listbox"]`) ?? undefined;
}
watch([levels, browsing], async () => {
  await nextTick();
  anchors.value = levels.value.map((_, level) => level === 0 ? undefined :
    Array.from(listAt(level - 1)?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
      .find(option => option.dataset.value === browsing.value[level - 1]));
}, { immediate: true, flush: 'post' });
/** Moves focus across flyouts without turning branch exploration into selection.
 * @param event - Keyboard event from a level.
 * @param level - Current depth.
 */
async function navigate(event: KeyboardEvent, level: number): Promise<void> {
  const list = event.target as HTMLElement;
  if (list.getAttribute('role') !== 'listbox') return;
  const rtl = getComputedStyle(list).direction === 'rtl';
  const forward = event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
  const backward = event.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
  if (!forward && !backward) return;
  event.preventDefault(); event.stopPropagation(); cancelHover();
  if (forward) {
    const candidate = list.ownerDocument.getElementById(list.getAttribute('aria-activedescendant') ?? '')?.dataset.value;
    const node = levels.value[level]?.find(node => node.id === candidate && !node.disabled);
    if (!node?.children?.length) return;
    preview(level, node.id);
    await nextTick(); await nextTick();
    listAt(level + 1)?.focus({ preventScroll: true });
  } else if (level > 0) {
    listAt(level - 1)?.focus({ preventScroll: true });
    browsing.value = browsing.value.slice(0, level - 1);
  }
}
</script>

<template>
  <div ref="root" class="qk-cascader__panels">
    <CascaderLevel :nodes="nodes" :level="0" :label="label" :active="browsing[0]" :selected="selected"
      @hover="hover(0, $event)" @enter="cancelHover" @leave="cancelHover" @select="select(0, $event)" @navigate="navigate($event, 0)" />
    <CascaderFlyout v-for="(siblings, index) in levels.slice(1)" :key="`${index}:${browsing[index]}`" :level="index + 1" :anchor="anchors[index + 1]">
      <CascaderLevel :nodes="siblings" :level="index + 1" :label="label" :active="browsing[index + 1]" :selected="selected"
        @hover="hover(index + 1, $event)" @enter="cancelHover" @leave="cancelHover" @select="select(index + 1, $event)" @navigate="navigate($event, index + 1)" />
    </CascaderFlyout>
  </div>
</template>
