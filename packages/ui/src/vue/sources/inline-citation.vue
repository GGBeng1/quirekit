<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { QuireKitInlineCitationProps, QuireKitSourceNavigateDetails } from '../../components/sources';
import QuirePopoverRoot from '../popover/root.vue';
import QuirePopoverTrigger from '../popover/trigger.vue';
import QuirePopoverContent from '../popover/content.vue';
import QuirePopoverTitle from '../popover/title.vue';
import QuirePopoverDescription from '../popover/description.vue';
import QuireButton from '../button/button.vue';
import { useQuireKitMessages } from '../locale-provider/context';

const props = defineProps<QuireKitInlineCitationProps>();
const text = useQuireKitMessages('sources');
const emit = defineEmits<{
  /** Request navigation; URL authorization and routing belong to the host. */
  navigate: [details: QuireKitSourceNavigateDetails];
}>();
const open = ref(false);
// The preview is portalled after hydration; an SSR block positioner inside prose is invalid HTML.
const mounted = ref(false);
onMounted(() => { mounted.value = true; });
const available = computed(() => props.source !== undefined && !props.source.unavailable);

/** Close the preview and hand its stable source identity to the host. */
function navigate(): void {
  const source = props.source;
  if (!source || source.unavailable) return;
  open.value = false;
  emit('navigate', { sourceId: source.id, ...(source.href === undefined ? {} : { href: source.href }) });
}
</script>

<template>
  <sup class="qk-inline-citation">
    <QuirePopoverRoot v-model:open="open" placement="top" :auto-focus="false">
      <QuirePopoverTrigger as-child>
        <button type="button" class="qk-inline-citation__trigger" :aria-label="text.citation(label, source?.title ?? text.unavailable)">{{ label }}</button>
      </QuirePopoverTrigger>
      <QuirePopoverContent v-if="mounted" class="qk-inline-citation__card" border="subtle" :show-arrow="false" width="min(21rem, calc(100vw - 1rem))">
        <div class="qk-inline-citation__content">
          <span v-if="source?.label && available" class="qk-inline-citation__origin" dir="auto">{{ source.label }}</span>
          <QuirePopoverTitle class="qk-inline-citation__title" dir="auto">{{ available ? source?.title : text.unavailable }}</QuirePopoverTitle>
          <QuirePopoverDescription v-if="available && source?.description" class="qk-inline-citation__description" dir="auto">{{ source.description }}</QuirePopoverDescription>
          <blockquote v-if="available && source?.quote" class="qk-inline-citation__quote" dir="auto">{{ source.quote }}</blockquote>
          <QuireButton v-if="available" size="xs" variant="text" color="primary" @click="navigate">{{ text.navigate }}</QuireButton>
        </div>
      </QuirePopoverContent>
    </QuirePopoverRoot>
  </sup>
</template>
