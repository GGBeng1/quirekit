<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import { createQuireSelectionGesture } from '../../components/selection-gesture';
import type { QuireKitSelectionGestureProps, QuireKitSelectionGestureDetail, QuireKitSelectionGestureCancel, QuireSelectionGestureController } from '../../components/selection-gesture';

const props = defineProps<QuireKitSelectionGestureProps>();
const emit = defineEmits<{
  /** Accepted hold, suitable for projecting the provisional caret. */
  longPressStart: [detail: QuireKitSelectionGestureDetail];
  /** Hold released without dragging; the host may show simple actions. */
  longPress: [detail: QuireKitSelectionGestureDetail];
  /** Drag selection begins from the original hold point. */
  selectionStart: [detail: QuireKitSelectionGestureDetail];
  /** Frame-coalesced client point to hit-test in the host. */
  selectionChange: [detail: QuireKitSelectionGestureDetail];
  /** Successful drag release; the host may show selection actions. */
  selectionComplete: [detail: QuireKitSelectionGestureDetail];
  /** Accepted interaction was cancelled. */
  cancel: [detail: QuireKitSelectionGestureCancel];
}>();
defineSlots<{ default(): unknown }>();
const target = shallowRef<HTMLElement | null>(null);
let controller: QuireSelectionGestureController | undefined;
onMounted(() => {
  if (!target.value) return;
  controller = createQuireSelectionGesture({
    ...props, target: target.value,
    onLongPressStart: detail => emit('longPressStart', detail), onLongPress: detail => emit('longPress', detail),
    onSelectionStart: detail => emit('selectionStart', detail), onSelectionChange: detail => emit('selectionChange', detail),
    onSelectionComplete: detail => emit('selectionComplete', detail), onCancel: detail => emit('cancel', detail)
  });
});
watch(() => [props.disabled, props.longPressDelay, props.movementThreshold, props.pointerTypes], () => controller?.update(props), { flush: 'sync', deep: true });
onBeforeUnmount(() => { controller?.destroy(); controller = undefined; });
/** Cancels a gesture when the host invalidates document positions or changes input owner. */
function cancel(): void { controller?.cancel(); }
defineExpose({ cancel });
</script>

<template>
  <div ref="target" class="qk-selection-gesture"><slot /></div>
</template>
