<script setup lang="ts">
import { computed, ref } from 'vue';
import type { QuireKitSource, QuireKitSourceNavigateDetails, QuireKitSourcesProps } from '../../components/sources';
import QuireCollapsible from '../collapsible/collapsible.vue';
import QuireIcon from '../icon/icon.vue';
import { useQuireKitMessages } from '../locale-provider/context';

const props = withDefaults(defineProps<QuireKitSourcesProps>(), {
  defaultOpen: false, open: undefined
});
const emit = defineEmits<{
  /** Request disclosure in controlled mode. */
  'update:open': [value: boolean];
  /** Request host-owned routing, without opening an address directly. */
  navigate: [details: QuireKitSourceNavigateDetails];
}>();
const text = useQuireKitMessages('sources');
const title = computed(() => props.title ?? text.value.title);
const internalOpen = ref(props.defaultOpen);
const expanded = computed({
  get: () => props.open ?? internalOpen.value,
  set: value => { internalOpen.value = value; emit('update:open', value); }
});

/** Emit a source identity only while the resource is available.
 * @param source - Host-projected source.
 */
function navigate(source: QuireKitSource): void {
  if (source.unavailable) return;
  emit('navigate', { sourceId: source.id, ...(source.href === undefined ? {} : { href: source.href }) });
}
</script>

<template>
  <section v-if="sources.length" class="qk-sources" :aria-label="title">
    <QuireCollapsible v-model:open="expanded" :title="title" variant="plain" trigger-variant="text" indicator-placement="inline" size="sm">
      <template #trigger>
        <span class="qk-sources__trigger"><QuireIcon name="bookOpen" :size="12" /><span>{{ title }}</span><span class="qk-sources__count">{{ sources.length }}</span></span>
      </template>
      <div class="qk-sources__list" role="list">
        <div v-for="(source, index) in sources" :key="source.id" role="listitem" class="qk-sources__item">
          <button type="button" class="qk-sources__link" :disabled="source.unavailable" :aria-label="source.unavailable ? text.unavailableSource(source.title) : text.navigateTo(source.title)" @click="navigate(source)">
            <span class="qk-sources__number" aria-hidden="true">{{ index + 1 }}</span>
            <span class="qk-sources__text">
              <span class="qk-sources__title" dir="auto"><span class="qk-sources__title-text">{{ source.title }}</span><QuireIcon v-if="!source.unavailable" name="arrowUpRight" :size="12" /></span>
              <span v-if="source.label || source.unavailable" class="qk-sources__origin" dir="auto">{{ source.unavailable ? text.unavailable : source.label }}</span>
              <span v-if="source.description" class="qk-sources__description" dir="auto">{{ source.description }}</span>
            </span>
          </button>
        </div>
      </div>
    </QuireCollapsible>
  </section>
</template>
