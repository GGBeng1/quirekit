<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import type { QuireKitMenuEntry } from "../../../components/menu";
import QuireMenuItem from "../menu-item.vue";
import QuireMenuGroup from "../menu-group.vue";
import QuireMenuSubmenu from "../menu-submenu.vue";
import QuireIcon from "../../icon/icon.vue";
import QuireMenuSeparator from "../menu-separator.vue";
import QuireMenuRadioGroup from "../menu-radio-group.vue";
import QuireMenuRadioItem from "../menu-radio-item.vue";
import QuireMenuCheckboxItem from "../menu-checkbox-item.vue";

/** Framework-neutral declarations rendered inside a public Menu root. */
interface Props {
  /** Live localized item tree. */
  readonly items: readonly QuireKitMenuEntry[];
  /** Owner attributes projected to every teleported child menu. */
  readonly contentProps?: HTMLAttributes | undefined;
  /** Default close policy for ordinary commands. */
  readonly closeOnSelect?: boolean;
}
defineOptions({ name: "QuireMenuItems" });
defineProps<Props>();
defineSlots<{
  /** Optional product-owned leading illustration, recursively forwarded to leaves. */
  leading?: (props: { item: QuireKitMenuEntry }) => unknown;
}>();
const emit = defineEmits<{ /** Enabled leaf activation, once per request. */ select: [value: string] }>();
</script>

<template>
  <template v-for="item in items" :key="item.value">
    <QuireMenuSeparator v-if="item.kind === 'separator'" />
    <QuireMenuGroup v-else-if="item.kind === 'group'" :label="item.label">
      <QuireMenuItems :items="item.children ?? []" :content-props="contentProps ?? {}" v-bind="closeOnSelect === undefined ? {} : { closeOnSelect }" @select="emit('select', $event)">
        <template v-if="$slots.leading" #leading="scope"><slot name="leading" v-bind="scope" /></template>
      </QuireMenuItems>
    </QuireMenuGroup>
    <QuireMenuSubmenu v-else-if="item.kind === 'submenu' && !item.disabled" :content-props="contentProps ?? {}" :inset="items.some(entry => !!entry.icon)" :tone="item.tone ?? 'neutral'">
      <template #trigger>{{ item.label }}</template>
      <template v-if="item.icon" #leading><QuireIcon :name="item.icon" /></template>
      <QuireMenuItems :items="item.children ?? []" :content-props="contentProps ?? {}" v-bind="closeOnSelect === undefined ? {} : { closeOnSelect }" @select="emit('select', $event)">
        <template v-if="$slots.leading" #leading="scope"><slot name="leading" v-bind="scope" /></template>
      </QuireMenuItems>
    </QuireMenuSubmenu>
    <QuireMenuRadioGroup v-else-if="item.kind === 'radio-group'" :label="item.label" :model-value="item.selectedValue ?? ''" @update:model-value="emit('select', $event)">
      <QuireMenuRadioItem v-for="option in item.children ?? []" :key="option.value" :value="option.value" :disabled="item.disabled || option.disabled || false" :shortcut="option.shortcut ?? ''" :close-on-select="option.closeOnSelect ?? false"
        :inset="(item.children ?? []).some(entry => !!entry.icon)" :title="option.reason">
        <template v-if="$slots.leading || option.icon" #leading><slot name="leading" :item="option"><QuireIcon v-if="option.icon" :name="option.icon" /></slot></template>
        {{ option.label }}
      </QuireMenuRadioItem>
    </QuireMenuRadioGroup>
    <QuireMenuCheckboxItem v-else-if="item.checked !== undefined" :value="item.value" :checked="item.checked"
      :disabled="item.disabled ?? false" :shortcut="item.shortcut ?? ''" :tone="item.tone ?? 'neutral'" :close-on-select="item.closeOnSelect ?? false" :title="item.reason" :inset="items.some(entry => !!entry.icon)" @update:checked="emit('select', item.value)">
      <template v-if="$slots.leading || item.icon" #leading><slot name="leading" :item="item"><QuireIcon v-if="item.icon" :name="item.icon" /></slot></template>
      {{ item.label }}
    </QuireMenuCheckboxItem>
    <QuireMenuItem v-else :inset="items.some(entry => !!entry.icon)" :value="item.value" :disabled="item.disabled ?? false" :shortcut="item.shortcut ?? ''" :tone="item.tone ?? 'neutral'"
      :close-on-select="item.closeOnSelect ?? closeOnSelect ?? true" :title="item.reason" @select="emit('select', item.value)">
      <template v-if="$slots.leading || item.icon" #leading><slot name="leading" :item="item"><QuireIcon v-if="item.icon" :name="item.icon" /></slot></template>
      {{ item.label }}
    </QuireMenuItem>
  </template>
</template>
