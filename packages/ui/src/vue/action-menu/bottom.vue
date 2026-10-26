<script setup lang="ts">
import { Drawer } from "@ark-ui/vue/drawer";
import { nextTick, ref } from "vue";
import type { QuireKitActionMenuEntry, QuireKitActionMenuIconSlotProps } from "../../components/action-menu/types";
import Directory from "./directory.vue";
import type { ActionMenuView } from "./types";
import QuireButton from "../button/button.vue";
import DrawerContentFrame from "../drawer/content-frame.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** Current action directory rendered inside the task's existing Drawer provider. */
interface Props {
  /** Visible name of the current directory. */
  readonly title: string;
  /** Optional task or directory explanation. */
  readonly description?: string;
  /** Ordered actions in this directory only. */
  readonly actions: readonly QuireKitActionMenuEntry[];
  /** Bottom action tile strategy. */
  readonly layout?: "list" | "grid" | undefined;
  /** Show a full-query search field. */
  readonly searchable?: boolean | undefined;
  /** Whether the current directory has a parent. */
  readonly canGoBack?: boolean;
  /** Prevents activation while preserving focused controls. */
  readonly busy?: boolean;
  /** Current recoverable execution error. */
  readonly errorText?: string;
  /** Neutral directory feedback sharing the same live message lane. */
  readonly statusText?: string;
}

/** Task intents forwarded to the owning directory/session controller. */
interface Emits {
  /** Selects an enabled command or enters an enabled branch. */
  activate: [value: string];
  /** Returns to the current directory's parent. */
  back: [];
  /** Requests cancellation through the task controller. */
  cancel: [];
}

/** Decorative action slots shared with the desktop menu. */
interface Slots {
  /** Decorative icon; it must not add a separate interactive control. */
  readonly icon?: (props: QuireKitActionMenuIconSlotProps) => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  canGoBack: false, busy: false
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const text = useQuireKitMessages("actionMenu");
const body = ref<HTMLElement>(), query = ref("");


/** @param value - Requested entry identity. */
function activate(value: string): void {
  if (!props.busy && props.actions.some(action => action.value === value && !action.disabled)) emit("activate", value);
}

/** Sends a parent navigation intent without ending the task. */
function goBack(): void {
  if (!props.busy && props.canGoBack) emit("back");
}

/** Sends one user cancellation intent when execution is not busy. */
function cancel(): void {
  if (!props.busy) emit("cancel");
}

/** @returns The current directory's scroll and focused-action snapshot. */
function captureView(): ActionMenuView {
  const focused = body.value?.ownerDocument.activeElement;
  const action = focused && body.value?.contains(focused) ? focused.closest<HTMLElement>("[data-action-value]") : null;
  return { ...(props.searchable ? { query: query.value } : {}), scrollTop: body.value?.parentElement?.scrollTop ?? 0, focusedValue: action?.dataset.actionValue ?? null };
}

/**
 * Restores a parent directory after its owner changes the current action collection.
 * @param snapshot - View state captured before entering the child directory.
 * @returns Completion after the current directory's DOM has rendered.
 */
async function restoreView(snapshot: ActionMenuView): Promise<void> {
  query.value = snapshot.query ?? "";
  await nextTick();
  const actions = body.value?.querySelectorAll<HTMLButtonElement>("[data-action-value]");
  const available = Array.from(actions ?? []).filter(action => !action.disabled);
  const target = available.find(action => action.dataset.actionValue === snapshot.focusedValue)
    ?? available[0] ?? body.value?.closest<HTMLElement>('[role="dialog"]');
  target?.focus({ preventScroll: true });
  if (body.value?.parentElement) body.value.parentElement.scrollTop = snapshot.scrollTop;
}

defineExpose({ captureView, restoreView });
</script>

<template>
  <DrawerContentFrame :title="title" :description="description ?? ''" :show-close="false" content-class="qk-task__surface qk-action-menu__bottom">
    <template #header>
      <header class="qk-drawer__header qk-drawer__header--bottom qk-task__header">
        <QuireButton variant="text" v-if="canGoBack" class="qk-task__target" :aria-disabled="busy || undefined" @click="goBack">{{ text.back }}</QuireButton>
        <span class="qk-drawer__heading">
          <Drawer.Title class="qk-drawer__title">{{ title }}</Drawer.Title>
          <Drawer.Description v-if="description" class="qk-drawer__description">{{ description }}</Drawer.Description>
        </span>
        <Drawer.CloseTrigger as-child>
          <QuireButton variant="text" class="qk-task__target" :aria-label="text.close" :aria-disabled="busy || undefined">
            <QuireIcon name="close" :size="16" />
          </QuireButton>
        </Drawer.CloseTrigger>
      </header>
    </template>
    <div ref="body" class="qk-action-sheet" :aria-busy="busy || undefined">
      <Directory v-model:query="query" :actions="actions" :layout="layout" :searchable="searchable" :busy="busy" @activate="activate"><template v-if="$slots.icon" #icon="slotProps"><slot name="icon" v-bind="slotProps" /></template></Directory>
    </div>
    <template #footer>
      <div class="qk-action-sheet__footer qk-task__footer">
        <p class="qk-task__feedback" :class="errorText && !busy ? 'qk-action-sheet__error' : 'qk-action-sheet__status'" :role="busy ? 'status' : errorText ? 'alert' : statusText ? 'status' : undefined">{{ busy ? text.busy : errorText || statusText }}</p>
        <QuireButton variant="text" class="qk-action-sheet__cancel" :aria-disabled="busy || undefined" @click="cancel">{{ text.cancel }}</QuireButton>
      </div>
    </template>
  </DrawerContentFrame>
</template>
