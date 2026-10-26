<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import { useQuireKitMessages } from '../locale-provider/context';
import { createQuireSelectionHandles } from '../../components/selection-handles';
import type { QuireKitSelectionHandlesProps, QuireKitSelectionHandleDrag, QuireKitSelectionHandleDragEnd, QuireKitSelectionHandleNudge, QuireSelectionHandlesController } from '../../components/selection-handles';

const props = withDefaults(defineProps<Omit<QuireKitSelectionHandlesProps, 'messages'>>(), { disabled: false, selecting: false });
const text = useQuireKitMessages('selectionHandles');
const emit = defineEmits<{
  /** Gesture acquired without moving editor focus. */
  dragStart: [detail: QuireKitSelectionHandleDrag];
  /** The caret has been held long enough to begin selecting from its current position. */
  longPressStart: [detail: QuireKitSelectionHandleDrag];
  /** A held caret was released without extending the selection. */
  longPress: [detail: QuireKitSelectionHandleDrag];
  /** Latest adjusted client point; the host updates selection and feeds geometry back. */
  drag: [detail: QuireKitSelectionHandleDrag];
  /** Completion or cancellation, without implicit host rollback. */
  dragEnd: [detail: QuireKitSelectionHandleDragEnd];
  /** Successful pointer release after the final selection sample. */
  selectionComplete: [detail: QuireKitSelectionHandleDrag];
  /** Physical arrow intent, resolved against the host's document model. */
  nudge: [detail: QuireKitSelectionHandleNudge];
}>();
const host = shallowRef<HTMLElement | null>(null);
let controller: QuireSelectionHandlesController | undefined;
onMounted(() => {
  if (!host.value) return;
  controller = createQuireSelectionHandles({
    ...props, messages: text.value, ownerDocument: host.value.ownerDocument,
    onDragStart: detail => emit('dragStart', detail), onDrag: detail => emit('drag', detail),
    onLongPressStart: detail => emit('longPressStart', detail), onLongPress: detail => emit('longPress', detail),
    onDragEnd: detail => emit('dragEnd', detail), onNudge: detail => emit('nudge', detail),
    onSelectionComplete: detail => emit('selectionComplete', detail)
  });
  host.value.append(controller.element);
});
watch(() => [props.selection, props.disabled, props.selecting, text.value, props.longPressDelay, props.movementThreshold], () => controller?.update({ ...props, messages: text.value }), { deep: true, flush: 'sync' });
onBeforeUnmount(() => { controller?.destroy(); controller = undefined; });
/** Cancels the active drag when the host invalidates a document target. */
function cancel(): void { controller?.cancel(); }
defineExpose({ cancel });
</script>

<template>
  <div ref="host" class="qk-selection-handles__host" />
</template>
