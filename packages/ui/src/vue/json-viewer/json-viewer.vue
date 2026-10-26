<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { QuireKitJsonViewerProps, QuireKitJsonViewerView } from '../../components/json-viewer';
import { useQuireKitMessages } from '../locale-provider/context';
import QuireClipboard from '../clipboard/clipboard.vue';
import QuireCodeBlock from '../code-block/code-block.vue';
import QuireSegmented from '../segmented/segmented.vue';
import JsonNode from './json-node.vue';
import { parseJsonForViewer } from './parse';

const props = withDefaults(defineProps<QuireKitJsonViewerProps>(), {
  defaultView: 'tree', maxTreeCharacters: 100_000,
  maxDepth: 12, pageSize: 80, maxValueLength: 180, maxHeight: 400
});
const emit = defineEmits<{
  /** Requests a view change in controlled or uncontrolled usage. */
  'update:view': [view: QuireKitJsonViewerView];
}>();
const localView = ref<QuireKitJsonViewerView>(props.defaultView);
const treeLimit = computed(() => Math.max(1, Math.trunc(props.maxTreeCharacters)) || 100_000);
const parsed = computed(() => parseJsonForViewer(props.source, treeLimit.value));
const treeAvailable = computed(() => parsed.value.kind === 'tree');
const activeView = computed(() => treeAvailable.value ? props.view ?? localView.value : 'source');
const selection = computed({
  get: () => activeView.value,
  set: (value: string | null) => {
    if (value !== 'tree' && value !== 'source') return;
    localView.value = value;
    emit('update:view', value);
  }
});
const sourceExpanded = ref(false);
watch(() => props.source, () => { sourceExpanded.value = false; });
const sourceLimit = computed(() => Math.max(1, treeLimit.value));
const clipped = computed(() => props.source.length > sourceLimit.value && !sourceExpanded.value);
const visibleSource = computed(() => clipped.value ? `${props.source.slice(0, sourceLimit.value)}\n…` : props.source);
const height = computed(() => `${Number.isFinite(props.maxHeight) ? Math.max(80, props.maxHeight) : 400}px`);
const text = useQuireKitMessages('jsonViewer');
const label = computed(() => props.label ?? text.value.label);
const modeItems = computed(() => [{ value: 'tree', label: text.value.tree }, { value: 'source', label: text.value.source }]);
</script>

<template>
  <section class="qk-json-viewer" data-qk-not-prose :aria-label="label">
    <div class="qk-json-viewer__toolbar">
      <QuireSegmented v-if="treeAvailable" v-model="selection" :items="modeItems" :label="text.viewSwitch(label)" size="xs" />
      <span v-else class="qk-json-viewer__fallback">{{ parsed.kind === 'large' ? text.tooLarge : text.invalid }}</span>
      <QuireClipboard class="qk-json-viewer__copy" :value="source" :target="text.copyTarget" mode="icon" size="xs" variant="text" />
    </div>
    <div v-if="activeView === 'tree' && parsed.kind === 'tree'" class="qk-json-viewer__tree" :style="{ maxHeight: height }" tabindex="0" :aria-label="text.treeContent(label)">
      <JsonNode :key="source" :value="parsed.value" :name="null" :depth="0" :max-depth="Number.isFinite(maxDepth) ? Math.max(1, Math.trunc(maxDepth)) : 12"
        :page-size="Number.isFinite(pageSize) ? Math.max(1, Math.trunc(pageSize)) : 80" :text="text" :max-value-length="Number.isFinite(maxValueLength) ? Math.max(16, Math.trunc(maxValueLength)) : 180" />
    </div>
    <div v-else class="qk-json-viewer__source">
      <QuireCodeBlock :code="visibleSource" language="json" :header="false" :copy="false" variant="plain" density="compact" :max-height="maxHeight" :aria-label="text.sourceContent(label)" />
      <button v-if="source.length > sourceLimit" type="button" class="qk-json-viewer__expand-source" @click="sourceExpanded = !sourceExpanded">
        {{ sourceExpanded ? text.collapseSource : text.showFullSource }}
      </button>
    </div>
  </section>
</template>
