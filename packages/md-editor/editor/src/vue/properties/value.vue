<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { QuireTag } from "@quirekit/ui/vue";
import type { MdDocumentPropertyValueProps } from "./types";
const props = defineProps<MdDocumentPropertyValueProps>();
const emit = defineEmits<{ overflow: [value: boolean] }>();
const root = ref<HTMLElement>();
const text = computed(() => props.entry.value === undefined ? props.entry.source : props.entry.value === null ? "null" : String(props.entry.value));
const items = computed(() => Array.isArray(props.entry.value) ? (props.expanded ? props.entry.value : props.entry.value.slice(0, 4)) : []);
let observer: ResizeObserver | undefined;
/** Measures only this preview's text or four visible tags; document coordinates remain owned by CM. */
function measure(): void {
  if (props.expanded) return;
  const clipped = [...root.value?.querySelectorAll<HTMLElement>('[data-property-truncation]') ?? []]
    .some(element => element.clientWidth > 0 && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1));
  emit('overflow', clipped || Array.isArray(props.entry.value) && props.entry.value.length > 4);
}
onMounted(() => {
  const Observer = root.value?.ownerDocument.defaultView?.ResizeObserver;
  if (Observer) { observer = new Observer(measure); observer.observe(root.value!); }
  measure();
});
watch(() => [props.entry, props.expanded], () => { void nextTick(measure); }, { flush: 'post' });
onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <span ref="root" class="md-properties__value-content">
  <span v-if="Array.isArray(entry.value)" class="md-properties__tags">
    <QuireTag v-for="(value, index) in items" :key="index" size="sm" :truncate="!expanded" :max-width="expanded ? '100%' : '18ch'"><span data-property-truncation class="md-properties__tag-text" :title="String(value)">{{ value === null ? 'null' : String(value) }}</span></QuireTag>
    <span v-if="!expanded && entry.value.length > 4" class="md-properties__muted">+{{ entry.value.length - 4 }}</span>
    <span v-if="!entry.value.length" class="md-properties__muted">{{ english ? 'Empty list' : '空列表' }}</span>
  </span>
  <QuireTag v-else-if="typeof entry.value === 'boolean'" size="sm" :color="entry.value ? 'success' : 'neutral'" :icon="entry.value ? 'check' : 'minus'">
    {{ entry.value ? 'true' : 'false' }}
  </QuireTag>
  <span v-else data-property-truncation class="md-properties__text" :class="{ 'md-properties__text--collapsed': !expanded, 'md-properties__muted': text === '' || entry.value === null }">{{ text || (english ? 'Empty' : '空值') }}</span>
  </span>
</template>
