<script setup lang="ts">
import { Menu } from "@ark-ui/vue/menu";
import type { QuireKitMenuItemTone } from "../../components/menu";
import QuireKbd from "../kbd/kbd.vue";

/** Public properties for a checkable Menu item. */
interface Props {
  /** 选项的稳定唯一值。 */
  readonly value: string;
  /** Visual role of the option without changing its checked behavior. */
  readonly tone?: QuireKitMenuItemTone;
  /** Optional keyboard shortcut rendered in the trailing metadata column. */
  readonly shortcut?: string | readonly string[];
  /** Whether pointer and keyboard changes are unavailable. */
  readonly disabled?: boolean;
  /** Whether changing the option closes the owning menu. */
  readonly closeOnSelect?: boolean;
  /** Whether an icon-free option reserves the independent leading icon column. */
  readonly inset?: boolean;
  /** Optional one-line explanation shown under the label; the row grows to fit it. */
  readonly description?: string;
}

/** Public slots exposed by a checkable Menu item. */
interface Slots {
  /** Visible option label. */
  readonly default: () => unknown;
  /** Optional functional icon, separate from the trailing checked state. */
  readonly leading?: () => unknown;
  /** Optional trailing content that replaces the shortcut prop. */
  readonly trailing?: () => unknown;
}

const {
  value,
  tone = "neutral",
  shortcut,
  disabled = false,
  closeOnSelect = false,
  inset = false,
  description
} = defineProps<Props>();
const checked = defineModel<boolean>("checked", { required: true });
defineSlots<Slots>();
</script>

<template>
  <Menu.CheckboxItem
    v-model:checked="checked"
    :value="value"
    :disabled="disabled"
    :close-on-select="closeOnSelect"
    :data-tone="tone"
    class="qk-menu__item"
    :data-described="description ? '' : undefined"
  >
    <span v-if="$slots.leading || inset" class="qk-menu__leading qk-menu__indicator" aria-hidden="true">
      <slot name="leading" />
    </span>
    <span v-if="description" class="qk-menu__copy">
      <Menu.ItemText class="qk-menu__label"><slot /></Menu.ItemText>
      <span class="qk-menu__description">{{ description }}</span>
    </span>
    <Menu.ItemText v-else class="qk-menu__label"><slot /></Menu.ItemText>
    <span v-if="$slots.trailing" class="qk-menu__trailing" aria-hidden="true">
      <slot name="trailing" />
    </span>
    <span v-else-if="shortcut?.length" class="qk-menu__shortcut"><QuireKbd :keys="typeof shortcut === 'string' ? [shortcut] : shortcut" size="xs" /></span>
    <span class="qk-menu__selection-indicator qk-menu__indicator" :data-disabled="disabled || undefined" aria-hidden="true">
      <Menu.ItemIndicator>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3.5 8.2 2.7 2.7 6.3-6.2" />
        </svg>
      </Menu.ItemIndicator>
    </span>
  </Menu.CheckboxItem>
</template>
