<script setup lang="ts">
import { computed } from "vue";
import { QuireIcon, QuireMenuItem, QuireMenuItems, QuireMenuSeparator, QuireMenuSubmenu } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { ClassicToolbarContext } from "../../../contribution/toolbar/types";
import { changeClassicToolbarPopup } from "../../../contribution/toolbar/execution";
import { classicToolbarRenderers } from "../../../contribution/toolbar/renderers";

const props = defineProps<{
  /** Feature-owned menu or palette with its captured command metadata. */
  item: QuireKitToolbarEntry;
  /** Current mounted feature owners. */
  adapter: ClassicToolbarContext;
  /** Existing indentation controls appended to the alignment submenu. */
  indents: readonly QuireKitToolbarEntry[];
}>();
const emit = defineEmits<{
  /** One canonical action request. */
  execute: [event: QuireKitToolbarExecuteEvent];
}>();
const alignment = computed(() => props.item.kind === "menu");
const label = computed(() => alignment.value
  ? (props.adapter.model.locale === "en" ? "Alignment and indentation" : "对齐与缩进") : props.item.label);
const contentProps = computed(() => ({ ...props.item.overlayProps?.contentAttributes,
  style: { transitionProperty: "opacity" }, "data-block-format": props.item.value }));
/** @param expanded - Native submenu open state, admitted by the existing Classic owner. */
function setExpanded(expanded: boolean): void {
  changeClassicToolbarPopup({ item: props.item, path: [props.item.value], expanded }, props.adapter);
}
/** @param value - Selected leaf. @param item - Direct indent action or the original alignment menu. */
function select(value: string, item = props.item): void {
  emit("execute", { item, value, path: [item.value, value], source: item === props.item ? "menu" : "action", payload: undefined });
}
const scope = computed<QuireKitToolbarRendererScope>(() => ({
  item: props.item, path: [props.item.value], context: props.adapter,
  disabled: props.item.disabled ?? false, expanded: props.item.expanded ?? false, setExpanded,
  /** @param payload - Opaque parameters from the existing feature body. @param nativeEvent - Original activation. */
  execute(payload, nativeEvent) {
    emit("execute", { item: props.item, value: props.item.value, path: [props.item.value], source: "popup", payload,
      ...(nativeEvent ? { nativeEvent } : {}) });
  }
}));
</script>

<template>
  <QuireMenuItem v-if="item.disabled" :value="item.value" disabled>
    <template #leading><QuireIcon :name="item.icon" /></template>{{ label }}
  </QuireMenuItem>
  <QuireMenuSubmenu v-else :open="item.expanded ?? false" :width="alignment ? '200px' : 'auto'"
    :content-props="contentProps" @update:open="setExpanded($event === true)">
    <template #leading><QuireIcon :name="item.icon" :style="{ color: alignment ? 'var(--qk-color-info-text)' : 'var(--qk-color-warning-text)' }" /></template>
    <template #trigger>{{ label }}</template>
    <QuireMenuItems v-if="item.items" :items="item.items" @select="select" />
    <template v-if="alignment && indents.length">
      <QuireMenuSeparator />
      <QuireMenuItem v-for="entry in indents" :key="entry.value" :value="entry.value" :disabled="entry.disabled ?? false" @select="select(entry.value, entry)">
        <template #leading><QuireIcon :name="entry.icon" /></template>{{ entry.label }}
      </QuireMenuItem>
    </template>
    <component :is="classicToolbarRenderers[item.contentRenderer]" v-if="item.contentRenderer" :scope="scope" />
  </QuireMenuSubmenu>
</template>
