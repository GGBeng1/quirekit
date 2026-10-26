<script setup lang="ts">
import { Drawer } from "@ark-ui/vue/drawer";
import { Popover } from "@ark-ui/vue/popover";
import { computed, useId } from "vue";
import type { QuireKitChoicePickerItem, QuireKitChoicePickerItemSlotProps } from "../../components/choice-picker/types";
import type { QuireKitResolvedTaskPresentation } from "../../components/task/types";
import type { useTaskSelection } from "../shared/task/selection/controller";
import DrawerFrame from "../drawer/content-frame.vue";
import QuireButton from "../button/button.vue";
import QuireIconButton from "../button/icon-button.vue";
import QuireIcon from "../icon/icon.vue";
import QuireInput from "../input/input.vue";
import QuireListbox from "../listbox/listbox.vue";
import DesktopFrame from "../shared/task/selection/desktop-frame.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** Same search, option and confirmation content in either presentation. */
interface Props {
  /** Current concrete shell. */
  readonly presentation: QuireKitResolvedTaskPresentation;
  /** Task accessible title. */
  readonly title: string;
  /** Optional task description. */
  readonly description?: string | undefined;
  /** Shared selection controller. */
  readonly selection: ReturnType<typeof useTaskSelection<QuireKitChoicePickerItem>>;
  /** Current sole business submission. */
  readonly busy: boolean;
  /** Allows multiple draft values. */
  readonly multiple: boolean;
  /** Shows the stable query field. */
  readonly searchable: boolean;
  /** Host-owned remote loading state. */
  readonly loading: boolean;
  /** Current remote query failure. */
  readonly searchError?: string | undefined;
  /** Host submission failure message; the language pack supplies the fallback. */
  readonly errorText?: string | undefined;
  /** Host confirmation action name; the language pack supplies the fallback. */
  readonly confirmLabel?: string | undefined;
}
/** Close intents retained by the outer lifecycle controller. */
interface Emits {
  /** Requests explicit task cancellation. */
  cancel: [];
  /** Requests header close through the shared policy. */
  close: [];
}
/** Content customization without replacing task semantics. */
interface Slots {
  /** Decorative non-interactive candidate content. */
  readonly item?: (props: QuireKitChoicePickerItemSlotProps) => unknown;
  /** Empty candidates, including host recovery actions. */
  readonly empty?: () => unknown;
  /** Host loading decoration; the stable list remains mounted. */
  readonly loading?: () => unknown;
  /** Replaces the one live feedback lane's readable message. */
  readonly status?: (props: { busy: boolean; error: string | undefined; selectedCount: number }) => unknown;
}
const props = defineProps<Props>();
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const text = useQuireKitMessages("choicePicker");
const searchId = `choice-query-${useId()}`;
const frame = computed(() => props.presentation === "bottom" ? DrawerFrame : DesktopFrame);
const titlePart = computed(() => props.presentation === "bottom" ? Drawer.Title : Popover.Title);
const descriptionPart = computed(() => props.presentation === "bottom" ? Drawer.Description : Popover.Description);
const error = computed(() => props.selection.invalid.value ? text.value.invalid
  : props.selection.failed.value ? props.errorText ?? text.value.error : props.searchError);
const feedback = computed(() => props.busy ? text.value.submitting : error.value ?? (props.loading ? text.value.loading
  : props.selection.unknown.value.length ? text.value.unknown : text.value.selected(props.selection.draft.value.length)));

/** @param event - Native key boundary; composition must never activate or dismiss a task. */
function guardKey(event: KeyboardEvent): void {
  if ((event.isComposing || event.keyCode === 229 || props.selection.query.composing.value) && ["Enter", "Escape"].includes(event.key)) {
    event.preventDefault(); event.stopPropagation();
  }
  guardBusy(event);
}
/** @param event - Original busy option activation; navigation and focus remain available. */
function guardBusy(event: Event): void {
  if (!props.busy) return;
  if (event.type === "click" || ["Enter", " "].includes((event as KeyboardEvent).key)) { event.preventDefault(); event.stopPropagation(); }
}
</script>

<template>
  <component :is="frame" :title="title" :description="description ?? ''" :show-close="false" :content-class="presentation === 'bottom' ? 'qk-task__surface qk-choice-picker__surface qk-choice-picker__surface--bottom' : ''">
    <template #header>
      <header class="qk-choice-picker__header" @keydown.capture="guardKey">
        <div class="qk-choice-picker__heading">
          <span><component :is="titlePart" class="qk-drawer__title">{{ title }}</component><component :is="descriptionPart" v-if="description" class="qk-drawer__description">{{ description }}</component></span>
          <QuireIconButton variant="text" class="qk-task__target" :aria-disabled="busy || undefined" :label="text.close" @click="emit('close')"><QuireIcon name="close" :size="16" /></QuireIconButton>
        </div>
        <div v-if="searchable" class="qk-choice-picker__search">
          <label :for="searchId">{{ text.search }}</label>
          <QuireInput :id="searchId" type="search" width="100%" autocomplete="off" :model-value="selection.query.query.value" :read-only="busy"
            @update:model-value="selection.query.input" @compositionstart="selection.query.compositionStart" @compositionend="selection.query.compositionEnd" />
        </div>
      </header>
    </template>
    <div class="qk-choice-picker__options" :aria-busy="busy || loading || undefined" :aria-disabled="busy || undefined" @keydown.capture="guardKey" @click.capture="guardBusy">
      <div v-if="loading && $slots.loading" class="qk-choice-picker__loading"><slot name="loading" /></div>
      <QuireListbox :label="title" hide-label :items="selection.query.visibleItems.value" :model-value="selection.draft.value" :highlighted-value="selection.highlighted.value"
        :selection-mode="multiple ? 'multiple' : 'single'" :select-on-highlight="false" :deselectable="false" content-class="qk-choice-picker__list" item-class="qk-choice-picker__item"
        @update:model-value="selection.select" @update:highlighted-value="selection.highlighted.value = $event ?? null">
        <template v-if="$slots.item" #item="slotProps"><slot name="item" v-bind="slotProps" /></template>
        <template #empty><slot name="empty"><p>{{ loading ? text.loadingOptions : text.noMatches }}</p></slot></template>
      </QuireListbox>
    </div>
    <template #footer>
      <div class="qk-choice-picker__footer-content" @keydown.capture="guardKey">
        <p class="qk-choice-picker__status" :role="!busy && error ? 'alert' : 'status'" aria-atomic="true"><slot name="status" :busy="busy" :error="error" :selected-count="selection.draft.value.length">{{ feedback }}</slot></p>
        <div class="qk-choice-picker__actions">
          <QuireButton variant="text" class="qk-task__target" :aria-disabled="busy || undefined" @click="emit('cancel')">{{ text.cancel }}</QuireButton>
          <QuireButton v-if="selection.explicit.value || selection.failed.value" class="qk-task__target" color="primary" variant="solid" :aria-disabled="busy || undefined" @click="selection.confirm">{{ selection.failed.value ? text.retry : confirmLabel ?? text.confirm }}</QuireButton>
        </div>
      </div>
    </template>
  </component>
</template>
