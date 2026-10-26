<script setup lang="ts">
import { computed, ref, shallowRef, useId } from 'vue';
import { EnvironmentProvider } from '@ark-ui/vue/environment';
import { QuireDialogRoot } from '../dialog';
import { useModalSurfaceOwner } from '../shared/surface/use-modal-owner';
import Surface from './surface.vue';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitImagePreviewItem, QuireKitImagePreviewProps, QuireKitImagePreviewToolbarSlotProps } from './types';
const props = withDefaults(defineProps<QuireKitImagePreviewProps>(), { open: undefined, defaultOpen: false, index: undefined, defaultIndex: 0, loop: false, thumbnails: true, toolbar: true, caption: true, navigation: true, closeOnMaskClick: true, maskColor: '#000', maskOpacity: .8, maskBlur: 0, scheme: 'dark' });
const emit = defineEmits<{
  /** 请求打开或关闭。 */ 'update:open': [open: boolean];
  /** 请求切换当前图片。 */ 'update:index': [index: number];
}>();
defineSlots<{
  /** 渲染 layout 中声明的自定义工具栏位置。 */ 'toolbar-item'?(props: QuireKitImagePreviewToolbarSlotProps): unknown;
  /** 触发入口；open 接受图片索引并记录恢复焦点的元素。 */ default?(props: { open: (index?: number) => void; index: number }): unknown;
  /** 宿主提供的下载等操作，放置紧凑按钮。 */ actions?(props: { item: QuireKitImagePreviewItem | undefined; index: number }): unknown;
}>();
defineOptions({ inheritAttrs: false });
const id = `qk-image-preview-${useId()}`;
const owner = useModalSurfaceOwner();
const internalOpen = ref(props.defaultOpen);
const internalIndex = ref(props.defaultIndex);
const opener = shallowRef<HTMLElement | null>(null);
const opened = computed(() => owner.ready.value && (props.open ?? internalOpen.value));
const current = computed(() => Math.max(0, Math.min(props.items.length - 1, Math.trunc(props.index ?? internalIndex.value) || 0)));
const labels = useQuireKitMessages('imagePreview');
/** @param index - Requested picture index. */
function select(index: number): void { internalIndex.value = index; emit('update:index', index); }
/** @param value - Dialog's close or open request. */
function updateOpen(value: boolean): void { internalOpen.value = value; emit('update:open', value); }
/** @param index - Picture to open, defaults to current selection. */
function show(index = current.value): void {
  if (!owner.ready.value) return;
  const ownerDocument = resolvePreviewDocument();
  const activeElement = ownerDocument.activeElement;
  opener.value = isOwnedHtmlElement(activeElement, ownerDocument)
    ? activeElement
    : null;
  select(Math.max(0, Math.min(props.items.length - 1, index))); updateOpen(true);
}
/** @returns Safe initial focus target. */
function initialFocusEl(): HTMLElement | null {
  return resolvePreviewDocument().getElementById(`${id}-close`);
}
/** @returns Host-chosen or still-connected opener. */
function finalFocusEl(): HTMLElement | null { return props.finalFocusEl?.() ?? (opener.value?.isConnected ? opener.value : null); }
/** @returns Document that owns the preview surface and its focus lifecycle. */
function resolvePreviewDocument(): Document {
  return props.portalTarget?.ownerDocument ?? document;
}
/**
 * Checks one active element without relying on the global realm constructor.
 *
 * @param value - Candidate active element.
 * @param ownerDocument - Document that must own the candidate.
 * @returns Whether the candidate is a focusable HTML element in that document.
 */
function isOwnedHtmlElement(
  value: Element | null,
  ownerDocument: Document
): value is HTMLElement {
  return value !== null
    && value.ownerDocument === ownerDocument
    && typeof (value as HTMLElement).focus === 'function';
}
</script>
<template>
  <EnvironmentProvider :value="resolvePreviewDocument">
    <QuireDialogRoot :open="opened" :content-id="id" :initial-focus-el="initialFocusEl" :final-focus-el="finalFocusEl" :restore-focus="owner.open.value" :close-on-interact-outside="false" @update:open="updateOpen">
      <slot :open="show" :index="current" />
      <Surface v-if="opened" v-bind="$attrs" :id="id" :items="items" :index="current" :loop="loop" :thumbnails="thumbnails" :options="props" :labels="labels" @close="updateOpen(false)" @select="select"><template v-if="$slots.actions" #actions="context"><slot name="actions" v-bind="context" /></template><template v-if="$slots['toolbar-item']" #toolbar-item="context"><slot name="toolbar-item" v-bind="context" /></template></Surface>
    </QuireDialogRoot>
  </EnvironmentProvider>
</template>
