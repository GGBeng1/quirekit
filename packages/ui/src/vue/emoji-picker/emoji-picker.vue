<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { QuireKitEmojiPickerProps, QuireKitEmojiItem } from "../../components/emoji-picker";
import { createQuireEmojiCatalog, createQuireEmojiGroups, filterQuireEmojis } from "../../components/emoji-picker";
import { createEmojiSections } from "../../components/emoji-picker/sections";
import { useEmojiNavigation } from "./navigation";
import type { EmojiScrollHandle } from "./types";
import QuireInput from "../input/input.vue";
import QuireIcon from "../icon/icon.vue";
import QuireToolbar from "../toolbar/toolbar.vue";
import QuirePresetGallery from "../preset-gallery/preset-gallery.vue";
import QuireScrollArea from "../scroll-area/scroll-area.vue";
import QuireEmptyState from "../empty-state/empty-state.vue";
import { useQuireKitMessages } from "../locale-provider/context";

const props = withDefaults(defineProps<QuireKitEmojiPickerProps>(), { disabled: false, autofocus: false });
const emit = defineEmits<{
  /** User activation, including repeated choices; keyboard navigation does not select. */ select: [item: QuireKitEmojiItem];
  /** Exact Unicode model update. */ "update:modelValue": [value: string];
}>();
const area = ref<EmojiScrollHandle>(), content = ref<HTMLElement>(), query = ref("");
const text = useQuireKitMessages("emojiPicker");
const items = computed(() => filterQuireEmojis(props.items ?? createQuireEmojiCatalog(text.value), ""));
const groups = computed(() => props.groups ?? createQuireEmojiGroups(text.value));
// Each gallery owns one flat keyboard grid; category metadata belongs only to the enclosing section.
const sections = computed(() => createEmojiSections(items.value, groups.value, text.value, props.common, props.recent)
  .map(section => ({ ...section, items: section.items.map(({ value, label }) => ({ value, label })) })));
const searching = computed(() => Boolean(query.value.trim()));
const results = computed(() => filterQuireEmojis(items.value, query.value).map(({ value, label }) => ({ value, label })));
const title = computed(() => searching.value ? text.value.results : text.value.label);
const { active, register, sync, jump, refresh } = useEmojiNavigation(area, content,
  () => searching.value ? [] : sections.value.map(section => section.key));
const navigation = computed(() => sections.value.map(section => ({ value: section.key, label: section.label, icon: section.icon,
  kind: "toggle" as const, pressed: !searching.value && section.key === (active.value ?? sections.value[0]?.key),
  disabled: props.disabled, attributes: { "data-emoji-category": section.key } })));

// Only an explicit search resets the viewport; category jumps run after this DOM update.
watch(query, () => { area.value?.scrollTo({ top: 0, behavior: "instant" }); refresh(); }, { flush: "post" });

/** @param value - Explicit Unicode choice from the public gallery. */
function select(value: string): void {
  const item = items.value.find(item => item.value === value);
  if (!item || props.disabled) return;
  emit("update:modelValue", value); emit("select", item);
}
/** @param value - Category identity. @returns Completion after search clears and the shared viewport moves. */
async function changeCategory(value: string): Promise<void> {
  if (props.disabled) return;
  query.value = "";
  await nextTick();
  jump(value);
}
</script>
<template>
  <section class="qk-emoji-picker" :aria-label="label ?? text.label" @keydown.stop>
    <div class="qk-emoji-picker__search">
      <QuireInput v-model="query" width="100%" :autofocus="autofocus" :disabled="disabled"
        :aria-label="text.search" :placeholder="text.search">
        <template #leading><QuireIcon name="search" /></template>
      </QuireInput>
    </div>
    <QuireScrollArea ref="area" class="qk-emoji-picker__results" scrollbar-visibility="always" @scroll="sync">
      <div ref="content" class="qk-emoji-picker__content">
        <template v-if="searching || !sections.length">
          <p class="qk-emoji-picker__heading" aria-live="polite">{{ title }}</p>
          <QuirePresetGallery :label="title" hide-label presentation="icons" :items="results" :max-columns="10" min-item-width="28px"
            :model-value="modelValue ?? null" :disabled="disabled" @select="select">
            <template #preview="{ item }"><span class="qk-emoji-picker__glyph">{{ item.value }}</span></template>
            <template #empty><QuireEmptyState :title="text.empty" size="sm" /></template>
          </QuirePresetGallery>
        </template>
        <template v-else>
          <section v-for="section in sections" :key="section.key" :ref="element => register(section.key, element)"
            class="qk-emoji-picker__section" :data-emoji-section="section.key">
            <h3 class="qk-emoji-picker__heading">{{ section.label }}</h3>
            <QuirePresetGallery :label="section.label" hide-label presentation="icons" :items="section.items" :max-columns="10" min-item-width="28px"
              :model-value="modelValue ?? null" :disabled="disabled" @select="select">
              <template #preview="{ item }"><span class="qk-emoji-picker__glyph">{{ item.value }}</span></template>
            </QuirePresetGallery>
          </section>
        </template>
      </div>
    </QuireScrollArea>
    <div class="qk-emoji-picker__categories">
      <QuireToolbar class="w-full" :label="text.categories" variant="plain" size="sm" align="center" overflow="scroll" :items="navigation"
        @execute="changeCategory($event.value)" />
    </div>
  </section>
</template>
