<script setup lang="ts">
import { computed, nextTick, provide, shallowRef, watch } from 'vue';
import type { QuireKitAttachmentActionDetails, QuireKitAttachmentsProps } from '../../components/attachment';
import QuireAttachment from './attachment.vue';
import AttachmentActions from './actions.vue';
import QuireImagePreview from '../image-preview/image-preview.vue';
import { imagePreviewGroupKey } from '../image-preview/group/context';
import { useImagePreviewGroup } from '../image-preview/group/use';
import type { ImagePreviewGroupMember } from '../image-preview/group/types';
import { useQuireKitMessages } from '../locale-provider/context';
import HorizontalStrip from '../shared/horizontal-scroll/strip.vue';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitAttachmentsProps>(), { layout: 'list', preview: true });
const emit = defineEmits<{ /** 转发附件业务操作；集合变化必须由宿主提供。 */ action: [details: QuireKitAttachmentActionDetails] }>();
const root = shallowRef<HTMLElement | null>(null);
const gallery = useImagePreviewGroup(ownsImage);
const resources = new Map<string, string>();
provide(imagePreviewGroupKey, { ...gallery.context, register });
const text = useQuireKitMessages('attachment');
const label = computed(() => props.label ?? text.value.attachments);

/** @param element - Explicitly registered Image root. @returns Whether this is its nearest attachment collection. */
function ownsImage(element: HTMLElement): boolean { return element.closest('.qk-attachments') === root.value; }
/** @returns A surviving opener or the stable collection after resource removal. */
function finalFocusEl(): HTMLElement | null { return gallery.finalFocusEl() ?? root.value; }
/** Register ownership once at mount; duplicate URLs must not conflate two files.
 * @param member - Existing Image's instance identity and resource refs.
 * @returns Matching unregistration and ownership cleanup.
 */
function register(member: ImagePreviewGroupMember): () => void {
  const id = member.element.value?.closest<HTMLElement>('[data-attachment-id]')?.dataset.attachmentId;
  if (id !== undefined) resources.set(member.id, id);
  const unregister = gallery.context.register(member);
  return () => { unregister(); resources.delete(member.id); };
}
const activeItem = computed(() => {
  const image = gallery.items.value[gallery.index.value];
  return image ? props.items.find(item => item.id === resources.get(image.id)) : undefined;
});

// Only membership changes inspect the focused item. Progress and streamed text
// never scan the DOM; a remote removal must not steal unrelated keyboard focus.
watch(() => props.items.map(item => item.id), async (ids, previous) => {
  if (ids.length === previous.length && ids.every((id, index) => id === previous[index])) return;
  const active = root.value?.ownerDocument.activeElement as HTMLElement | null;
  const removed = active?.closest<HTMLElement>('[data-attachment-id]');
  const index = root.value?.contains(removed ?? null) && removed && !ids.includes(removed.dataset.attachmentId!) && !gallery.opened.value
    ? previous.indexOf(removed.dataset.attachmentId!) : -1;
  await nextTick();
  if (gallery.opened.value) gallery.refresh();
  if (index < 0) return;
  const current = root.value?.ownerDocument.activeElement;
  if (current && current !== root.value?.ownerDocument.body && current !== active) return;
  const remaining = root.value?.querySelectorAll<HTMLElement>('[data-attachment-id]');
  const target = remaining?.[Math.min(index, remaining.length - 1)];
  (target?.querySelector<HTMLElement>('button:not(:disabled)') ?? root.value)?.focus({ preventScroll: true });
}, { flush: 'pre' });
</script>

<template>
  <div ref="root" v-bind="$attrs" class="qk-attachments" :data-layout="layout" role="group" :aria-label="label" tabindex="-1">
    <HorizontalStrip :enabled="layout === 'strip'" :previous-label="text.previous" :next-label="text.next">
      <div class="qk-attachments__items">
        <QuireAttachment v-for="item in items" :key="item.id" :item="item" :layout="layout" :preview="preview" @action="emit('action', $event)" />
      </div>
    </HorizontalStrip>
  </div>
  <QuireImagePreview :items="gallery.items.value" v-model:open="gallery.opened.value" v-model:index="gallery.index.value" :final-focus-el="finalFocusEl">
    <template #actions><AttachmentActions v-if="activeItem" :item="activeItem" @action="emit('action', $event)" /></template>
  </QuireImagePreview>
</template>
