<script setup lang="ts">
import { nextTick, ref, shallowRef, useId, watch } from "vue";
import { useCommandListFocus } from "./focus";
import {
  resolveQuireKitCommandListFocus
} from "./navigation";
import type {
  QuireKitCommandListMovement,
  QuireKitCommandListHandle,
  QuireKitCommandListProps,
  QuireKitCommandListSlots
} from "./types";

const props = withDefaults(defineProps<QuireKitCommandListProps>(), {
  surfaceClass: undefined
});
defineSlots<QuireKitCommandListSlots>();
const emit = defineEmits<{
  /** Reports one enabled feature-owned command activation. */
  select: [key: string];
}>();
const buttons = shallowRef<HTMLButtonElement[]>([]);
const activeIndex = ref(0);
const descriptionId = `qk-command-description-${useId()}`;
const menuId = `qk-command-list-${useId()}`;
useCommandListFocus(() => props.focusOwner, menuId, () => props.items[activeIndex.value] && !props.items[activeIndex.value]?.disabled ? `${menuId}-${activeIndex.value}` : undefined);
defineExpose<QuireKitCommandListHandle>({ handleKeydown });

/**
 * Activates one enabled command through the feature-owned handler.
 *
 * @param index - Zero-based row position.
 */
function activate(index: number): void {
  const item = props.items[index];
  if (item === undefined || item.disabled) return;
  activeIndex.value = index;
  emit("select", item.key);
}

/**
 * Moves roving focus through enabled menu commands.
 *
 * @param event - Browser key event dispatched by one menu row.
 * @param index - Current zero-based row position.
 */
function move(event: KeyboardEvent, index: number): void {
  if (event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const movement = resolveMovement(event.key);
  if (movement === undefined) return;
  event.preventDefault();
  const next = resolveQuireKitCommandListFocus(
    props.items,
    index,
    movement
  );
  activeIndex.value = next;
  void nextTick(() => {
    const button = buttons.value[next];
    if (props.focusOwner) button?.scrollIntoView({ block: "nearest", inline: "nearest" });
    else button?.focus();
  });
}

/** @param event - Keyboard event forwarded by the native input owner. @returns Whether this enabled list consumed navigation or Enter. */
function handleKeydown(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
  if (!props.items.some(item => !item.disabled)) return false;
  if (resolveMovement(event.key)) { move(event, activeIndex.value); return true; }
  if (event.key !== "Enter" || !props.items[activeIndex.value] || props.items[activeIndex.value]?.disabled) return false;
  event.preventDefault(); activate(activeIndex.value); return true;
}

/**
 * Maps supported browser keys to the linear menu contract.
 *
 * @param key - Browser keyboard key.
 * @returns Shared movement, when the menu owns this key.
 */
function resolveMovement(
  key: string
): QuireKitCommandListMovement | undefined {
  if (key === "ArrowUp") return "previous";
  if (key === "ArrowDown") return "next";
  if (key === "Home") return "home";
  if (key === "End") return "end";
  return undefined;
}

/** Synchronizes the one Tab stop with checked and enabled command state. */
function synchronizeActiveIndex(): void {
  const checked = props.items.findIndex((item) => (
    item.checked === true && !item.disabled
  ));
  if (checked >= 0) {
    activeIndex.value = checked;
    return;
  }
  const current = props.items[activeIndex.value];
  if (current !== undefined && !current.disabled) return;
  activeIndex.value = props.items.findIndex((item) => !item.disabled);
  if (activeIndex.value < 0) activeIndex.value = 0;
}

watch(() => props.items, (items, previous) => {
  const key = previous?.[activeIndex.value]?.key;
  const retained = items.findIndex(item => item.key === key && !item.disabled);
  activeIndex.value = retained >= 0 ? retained : 0;
  synchronizeActiveIndex();
}, { immediate: true });
</script>

<template>
  <div
    class="qk-menu qk-command-list"
    :class="surfaceClass"
    :id="menuId"
    role="menu"
    :aria-label="label"
  >
    <template v-for="(item, index) in items" :key="item.key">
    <div v-if="item.group && item.group !== items[index - 1]?.group" class="qk-menu__group-label" role="presentation">{{ item.group }}</div>
    <button
      :ref="element => { buttons[index] = element as HTMLButtonElement; }"
      type="button"
      :id="`${menuId}-${index}`"
      class="qk-menu__item qk-command-list__item"
      :role="item.checked === undefined ? 'menuitem' : 'menuitemradio'"
      :aria-checked="item.checked"
      :data-state="item.checked ? 'checked' : undefined"
      :data-disabled="item.disabled ? '' : undefined"
      :data-highlighted="focusOwner && !item.disabled && index === activeIndex ? '' : undefined"
      :data-virtual-focus="focusOwner ? '' : undefined"
      :aria-label="item.label"
      :aria-describedby="item.description ? `${descriptionId}-${index}` : undefined"
      :disabled="item.disabled"
      :tabindex="!focusOwner && index === activeIndex ? 0 : -1"
      :data-command-key="item.key"
      :data-separator-before="item.separatorBefore ? 'true' : undefined"
      @focus="activeIndex = index"
      @pointermove="focusOwner && !item.disabled && (activeIndex = index)"
      @pointerdown.prevent
      @keydown="move($event, index)"
      @click="activate(index)"
    >
      <span class="qk-menu__indicator" aria-hidden="true">
        <slot name="leading" :item="item" :index="index">
          {{ item.checked === true ? "✓" : "" }}
        </slot>
      </span>
      <span class="qk-menu__label">
        {{ item.label }}
      </span>
      <span v-if="item.description" :id="`${descriptionId}-${index}`" :data-disabled="item.disabled || undefined" class="qk-command-list__description">{{ item.description }}</span>
      <span
        v-if="$slots.trailing"
        class="qk-menu__trailing"
        aria-hidden="true"
      >
        <slot name="trailing" :item="item" :index="index" />
      </span>
    </button>
    </template>
  </div>
</template>
