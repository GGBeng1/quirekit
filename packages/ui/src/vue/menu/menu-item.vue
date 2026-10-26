<script setup lang="ts">
import { Menu } from "@ark-ui/vue/menu";
import type { QuireKitMenuItemTone } from "../../components/menu";
import QuireKbd from "../kbd/kbd.vue";

/** Public properties for an ordinary Menu item. */
interface Props {
  /** Stable value emitted when the item is activated. */
  readonly value: string;
  /** Visual role of the action without changing its interaction behavior. */
  readonly tone?: QuireKitMenuItemTone;
  /** Optional keyboard shortcut rendered in the trailing metadata column. */
  readonly shortcut?: string | readonly string[];
  /** Whether pointer and keyboard activation are unavailable. */
  readonly disabled?: boolean;
  /** Whether activating this row closes the owning menu. */
  readonly closeOnSelect?: boolean;
  /** Whether an icon-free row reserves the leading indicator column. */
  readonly inset?: boolean;
  /** Optional one-line explanation shown under the label; the row grows to fit it. */
  readonly description?: string;
}

/** Public events emitted by an ordinary Menu item. */
interface Emits {
  /** 用户执行当前可用条目时触发。 */
  readonly select: [];
}

/** Public slots exposed by an ordinary Menu item. */
interface Slots {
  /** Visible item label. */
  readonly default: () => unknown;
  /** Optional leading icon. */
  readonly leading?: () => unknown;
  /** Optional trailing content that replaces the shortcut prop. */
  readonly trailing?: () => unknown;
}

const {
  value,
  tone = "neutral",
  shortcut,
  disabled = false,
  closeOnSelect = true,
  inset = false,
  description
} = defineProps<Props>();
const emit = defineEmits<Emits>();
defineSlots<Slots>();

/** Forwards accepted machine selection without depending on Ark's mount-time DOM lookup. */
function handleSelection(): void {
  if (!disabled) emit("select");
}
</script>

<template>
  <Menu.Item
    :value="value"
    :disabled="disabled"
    :close-on-select="closeOnSelect"
    :data-tone="tone"
    class="qk-menu__item"
    :data-described="description ? '' : undefined"
    @menu:select="handleSelection"
  >
    <span v-if="$slots.leading || inset" class="qk-menu__indicator" aria-hidden="true">
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
  </Menu.Item>
</template>
