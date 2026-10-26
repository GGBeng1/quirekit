<script setup lang="ts">
import { Drawer } from "@ark-ui/vue/drawer";
import { Popover } from "@ark-ui/vue/popover";
import { computed } from "vue";
import type { QuireKitPresetGalleryItem, QuireKitPresetGalleryItemSlotProps } from "../../components/preset-gallery/types";
import type { QuireKitResolvedTaskPresentation } from "../../components/task/types";
import type { useTaskSelection } from "../shared/task/selection/controller";
import DrawerFrame from "../drawer/content-frame.vue";
import DesktopFrame from "../shared/task/selection/desktop-frame.vue";
import QuireButton from "../button/button.vue";
import QuireIconButton from "../button/icon-button.vue";
import QuireIcon from "../icon/icon.vue";
import QuirePresetGallery from "../preset-gallery/preset-gallery.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** One Gallery and confirmation boundary inside either shared physical frame. */
interface Props {
  /** Current concrete shell. */
  readonly presentation: QuireKitResolvedTaskPresentation;
  /** Accessible task title. */
  readonly title: string;
  /** Optional task explanation. */
  readonly description?: string | undefined;
  /** Shared array-based selection owner, projected to one Gallery value. */
  readonly selection: ReturnType<typeof useTaskSelection<QuireKitPresetGalleryItem>>;
  /** Whether the current submission is still pending. */
  readonly busy: boolean;
  /** Maximum Gallery column count. */
  readonly maxColumns: number;
  /** Optional Gallery minimum item width override. */
  readonly minItemWidth?: string | undefined;
  /** Host submission failure message; the language pack supplies the fallback. */
  readonly errorText?: string | undefined;
  /** Host confirmation action name; the language pack supplies the fallback. */
  readonly confirmLabel?: string | undefined;
}
/** Close requests remain owned by the shared task lifecycle. */
interface Emits {
  /** Requests cancellation through the task guard. */
  cancel: [];
  /** Requests header dismissal through the task guard. */
  close: [];
}
/** Gallery decoration retains the existing widget's semantics and geometry. */
interface Slots {
  /** Decorative preset preview without nested interactive controls. */
  readonly preview?: (props: QuireKitPresetGalleryItemSlotProps) => unknown;
  /** Replaces the Gallery's empty-state content. */
  readonly empty?: () => unknown;
}
const props = defineProps<Props>();
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const text = useQuireKitMessages("presetPicker");
const frame = computed(() => props.presentation === "bottom" ? DrawerFrame : DesktopFrame);
const titlePart = computed(() => props.presentation === "bottom" ? Drawer.Title : Popover.Title);
const descriptionPart = computed(() => props.presentation === "bottom" ? Drawer.Description : Popover.Description);
const error = computed(() => props.selection.invalid.value ? text.value.invalid
  : props.selection.failed.value ? props.errorText ?? text.value.error : undefined);
const feedback = computed(() => props.busy ? text.value.submitting : error.value ?? (props.selection.unknown.value.length
  ? text.value.unknown : props.selection.draft.value.length ? text.value.selected : text.value.none));

/** @param value - One Gallery draft selection, without committing its preview. */
function select(value: string | null): void { props.selection.select(value === null ? [] : [value]); }
/** @param event - Original activation while preserving navigation and the focused widget. */
function guardActivation(event: Event): void {
  const keyboard = event as KeyboardEvent;
  const composing = event.type === "keydown" && (keyboard.isComposing || keyboard.keyCode === 229);
  if ((composing && ["Enter", "Escape"].includes(keyboard.key))
    || (props.busy && (event.type === "click" || ["Enter", " "].includes(keyboard.key)))) {
    event.preventDefault(); event.stopPropagation();
  }
}
</script>

<template>
  <component :is="frame" :title="title" :description="description ?? ''" :show-close="false"
    :content-class="`qk-task__surface qk-preset-picker__surface qk-preset-picker__surface--${presentation}`">
    <template #header>
      <header class="qk-preset-picker__header" @keydown.capture="guardActivation">
        <span><component :is="titlePart" class="qk-drawer__title">{{ title }}</component><component :is="descriptionPart" v-if="description" class="qk-drawer__description">{{ description }}</component></span>
        <QuireIconButton variant="text" class="qk-preset-picker__target" :aria-disabled="busy || undefined" :label="text.close" @click="emit('close')"><QuireIcon name="close" :size="16" /></QuireIconButton>
      </header>
    </template>
    <div class="qk-preset-picker__options" :aria-busy="busy || undefined" @keydown.capture="guardActivation" @click.capture="guardActivation">
      <QuirePresetGallery :label="title" hide-label :items="selection.query.visibleItems.value" :model-value="selection.draft.value[0] ?? null"
        :highlighted-value="selection.highlighted.value" :max-columns="maxColumns"
        v-bind="minItemWidth === undefined ? {} : { minItemWidth }"
        @update:model-value="select" @update:highlighted-value="selection.highlighted.value = $event ?? null">
        <template v-if="$slots.preview" #preview="slotProps"><slot name="preview" v-bind="slotProps" /></template>
        <template v-if="$slots.empty" #empty><slot name="empty" /></template>
      </QuirePresetGallery>
    </div>
    <template #footer>
      <div class="qk-preset-picker__footer-content" @keydown.capture="guardActivation">
        <p class="qk-preset-picker__status" :role="!busy && error ? 'alert' : 'status'" aria-atomic="true">{{ feedback }}</p>
        <div class="qk-preset-picker__actions">
          <QuireButton variant="text" class="qk-preset-picker__target" :aria-disabled="busy || undefined" @click="emit('cancel')">{{ text.cancel }}</QuireButton>
          <QuireButton v-if="selection.explicit.value || selection.failed.value" class="qk-preset-picker__target" color="primary" variant="solid" :aria-disabled="busy || undefined" @click="selection.confirm">{{ selection.failed.value ? text.retry : confirmLabel ?? text.confirm }}</QuireButton>
        </div>
      </div>
    </template>
  </component>
</template>
