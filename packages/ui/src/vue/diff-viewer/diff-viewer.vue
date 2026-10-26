<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { QuireKitDiffViewerProps, QuireKitDiffViewerView } from '../../components/diff-viewer';
import QuireClipboard from '../clipboard/clipboard.vue';
import QuireCodeBlock from '../code-block/code-block.vue';
import QuireSegmented from '../segmented/segmented.vue';
import DiffHunk from './diff-hunk.vue';
import { parseDiffForViewer } from './parse';
import { useQuireKitMessages } from '../locale-provider/context';

const props = withDefaults(defineProps<QuireKitDiffViewerProps>(), {
  defaultView: 'diff', maxStructuredCharacters: 150_000, maxVisibleLines: 120, maxHeight: 480
});
const text = useQuireKitMessages('diffViewer');
const label = computed(() => props.label ?? text.value.label);
const emit = defineEmits<{
  /** Requests a view change in controlled or uncontrolled usage. */
  'update:view': [view: QuireKitDiffViewerView];
}>();
const localView = ref<QuireKitDiffViewerView>(props.defaultView);
const structuredLimit = computed(() => Number.isFinite(props.maxStructuredCharacters)
  ? Math.max(1, Math.trunc(props.maxStructuredCharacters)) : 150_000);
const parsed = computed(() => parseDiffForViewer(props.patch, structuredLimit.value));
const diffAvailable = computed(() => parsed.value.kind === 'diff');
const activeView = computed(() => diffAvailable.value ? props.view ?? localView.value : 'source');
const selection = computed({
  get: () => activeView.value,
  set: (value: string | null) => {
    if (value !== 'diff' && value !== 'source') return;
    localView.value = value;
    emit('update:view', value);
  }
});
const sourceExpanded = ref(false);
watch(() => props.patch, () => { sourceExpanded.value = false; });
const clipped = computed(() => props.patch.length > structuredLimit.value && !sourceExpanded.value);
const visibleSource = computed(() => clipped.value ? `${props.patch.slice(0, structuredLimit.value)}\n…` : props.patch);
const height = computed(() => `${Number.isFinite(props.maxHeight) ? Math.max(80, props.maxHeight) : 480}px`);
const visibleLineLimit = computed(() => Number.isFinite(props.maxVisibleLines)
  ? Math.max(2, Math.trunc(props.maxVisibleLines)) : 120);
const modeItems = computed(() => [{ value: 'diff', label: text.value.diff }, { value: 'source', label: text.value.source }]);
</script>

<template>
  <section class="qk-diff-viewer" data-qk-not-prose :aria-label="label">
    <div class="qk-diff-viewer__toolbar">
      <QuireSegmented v-if="diffAvailable" v-model="selection" :items="modeItems" :label="text.viewSwitch(label)" size="xs" />
      <span v-else class="qk-diff-viewer__fallback">{{ parsed.kind === 'large' ? text.tooLarge : text.invalid }}</span>
      <span v-if="parsed.kind === 'diff'" class="qk-diff-viewer__totals">+{{ parsed.additions }} −{{ parsed.removals }}</span>
      <QuireClipboard class="qk-diff-viewer__copy" :value="patch" :target="text.copyTarget" mode="icon" size="xs" variant="text" />
    </div>
    <div v-if="activeView === 'diff' && parsed.kind === 'diff'" :key="patch" class="qk-diff-viewer__content" :style="{ maxHeight: height }" tabindex="0" :aria-label="text.diffContent(label)">
      <template v-for="(segment, index) in parsed.segments" :key="index">
        <div v-if="segment.kind === 'metadata'" class="qk-diff-viewer__metadata">
          <div v-for="(line, lineIndex) in segment.lines" :key="lineIndex">{{ line }}</div>
        </div>
        <DiffHunk v-else :hunk="segment.hunk" :max-visible-lines="visibleLineLimit" />
      </template>
    </div>
    <div v-else class="qk-diff-viewer__source">
      <QuireCodeBlock :code="visibleSource" language="diff" :header="false" :copy="false" variant="plain" density="compact" :max-height="maxHeight" :aria-label="text.sourceContent(label)" />
      <button v-if="patch.length > structuredLimit" type="button" class="qk-diff-viewer__expand-source" @click="sourceExpanded = !sourceExpanded">
        {{ sourceExpanded ? text.collapseSource : text.showFullSource }}
      </button>
    </div>
  </section>
</template>
