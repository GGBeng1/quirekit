<script setup lang="ts">
import { Listbox, useListboxContext } from "@ark-ui/vue/listbox";
import { computed, useId } from "vue";
import type { QuireKitListboxItem, QuireKitListboxItemSlotProps } from "../../components/listbox";
import QuireIcon from "../icon/icon.vue";

/** 保留上游 option identity 的私有呈现属性。 */
interface Props {
  /** 当前可见候选。 */
  readonly item: QuireKitListboxItem;
  /** 组合配方明确附加到 option 根节点的类。 */
  readonly itemClass?: string | undefined;
}

/** 同源公开 item 插槽的透传合同。 */
interface Slots {
  /** 替换全部非交互条目内容。 */
  readonly default?: (props: QuireKitListboxItemSlotProps) => unknown;
}

const props = defineProps<Props>();
defineSlots<Slots>();
const emit = defineEmits<{
  /** Reports a valid native option click after the existing selection handler. */
  select: [value: string];
}>();
const listbox = useListboxContext();
const state = computed(() => listbox.value.getItemState({ item: props.item }));
const descriptionId = useId();

/**
 * Keeps the pressed option under the pointer while the machine takes focus.
 * @param event - Native option press before Ark's bubbling mousedown handler.
 */
function focusWithoutScroll(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || state.value.disabled) return;
  const id = listbox.value.getContentProps().id;
  if (typeof id !== "string") return;
  const owner = (event.currentTarget as HTMLElement).ownerDocument;
  // Ark may focus again; the already focused element then preserves scroll and click targeting.
  owner.getElementById(id)?.focus({ preventScroll: true });
}

/**
 * Reports explicit pointer activation independently from a changed selection.
 * @param event - Native option click already offered to the headless item.
 */
function select(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || state.value.disabled) return;
  emit("select", props.item.value);
}
</script>

<template>
  <Listbox.Item
    :item="item"
    :class="['qk-listbox__item', itemClass]"
    :aria-label="item.label"
    :aria-describedby="item.description ? descriptionId : undefined"
    :data-focus-visible="state.focusVisible ? '' : undefined"
    @mousedown.capture="focusWithoutScroll"
    @click="select"
  >
    <slot :item="item" :selected="state.selected" :highlighted="listbox.highlightedValue === item.value" :disabled="state.disabled">
      <span class="qk-listbox__item-copy">
        <Listbox.ItemText class="qk-listbox__item-label">{{ item.label }}</Listbox.ItemText>
        <span v-if="item.description" class="qk-listbox__item-description" aria-hidden="true">{{ item.description }}</span>
      </span>
      <span class="qk-listbox__indicator" aria-hidden="true">
        <QuireIcon v-if="state.selected" name="check" :size="16" />
      </span>
    </slot>
    <span v-if="item.description" :id="descriptionId" class="qk-listbox__visually-hidden">{{ item.description }}</span>
  </Listbox.Item>
</template>
