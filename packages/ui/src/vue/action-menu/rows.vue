<script setup lang="ts">
import { computed } from "vue";
import type { QuireKitActionMenuEntry, QuireKitActionMenuIconSlotProps } from "../../components/action-menu";
import QuireMenuItem from "../menu/menu-item.vue";
import QuireMenuSubmenu from "../menu/menu-submenu.vue";
import QuireMenuGroup from "../menu/menu-group.vue";
import QuireIcon from "../icon/icon.vue";
import { groupActionMenu } from "./path";
import { useQuireKitMessages } from "../locale-provider/context";

/** Shared directory rows, keeping Ark as the sole menu navigation owner. */
interface Props {
  /** Current directory, including nested branches. */
  readonly actions: readonly QuireKitActionMenuEntry[];
  /** Whether execution is temporarily locked. */
  readonly busy: boolean;
}
/** Current executable command intent. */
interface Emits {
  /** Requests execution after Ark accepts an ordinary menu item. */
  activate: [value: string];
}
/** Decorative row content. */
interface Slots {
  /** Replaces the leading action icon. */
  readonly icon?: (props: QuireKitActionMenuIconSlotProps) => unknown;
}
const props = defineProps<Props>();
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const text = useQuireKitMessages("actionMenu");
const groups = computed(() => groupActionMenu(props.actions));
</script>

<template>
  <template v-for="(group, index) in groups" :key="index">
    <QuireMenuGroup v-bind="group.label === undefined ? {} : { label: group.label }">
      <template v-for="action in group.actions" :key="action.value">
        <QuireMenuSubmenu v-if="action.kind === 'branch' && !action.disabled" :tone="action.danger ? 'danger' : 'neutral'"
          trigger-class="qk-action-menu__item" content-class="qk-action-menu__surface">
          <template #trigger><span class="qk-action-menu__copy"><span>{{ action.label }}</span><span v-if="action.description" class="qk-action-menu__description">{{ action.description }}</span></span></template>
          <template v-if="action.icon || $slots.icon" #leading><slot name="icon" :action="action"><QuireIcon v-if="action.icon" :name="action.icon" :size="16" /></slot></template>
          <Rows :actions="action.children" :busy="busy" @activate="emit('activate', $event)">
            <template v-if="$slots.icon" #icon="slotProps"><slot name="icon" v-bind="slotProps" /></template>
          </Rows>
          <p v-if="action.children.length === 0" class="qk-action-sheet__empty">{{ text.empty }}</p>
        </QuireMenuSubmenu>
        <QuireMenuItem v-else :value="action.value" :disabled="!!action.disabled" :tone="action.danger ? 'danger' : 'neutral'"
          :close-on-select="false" :aria-disabled="busy || action.disabled || undefined" class="qk-action-menu__item" @select="!busy && emit('activate', action.value)">
          <template v-if="action.icon || $slots.icon" #leading><slot name="icon" :action="action"><QuireIcon v-if="action.icon" :name="action.icon" :size="16" /></slot></template>
          <span class="qk-action-menu__copy"><span>{{ action.label }}</span><span v-if="action.description" class="qk-action-menu__description">{{ action.description }}</span></span>
          <template v-if="action.kind === 'branch'" #trailing><QuireIcon name="chevronRight" :size="16" /></template>
        </QuireMenuItem>
      </template>
    </QuireMenuGroup>
  </template>
</template>
