<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Messages as QuireKitJsonViewerMessages } from '../../locale/components/json-viewer';

/** Internal tree row, rendered only for branches that the reader opens. */
interface Props {
  /** Parsed JSON value at this path. */
  readonly value: unknown;
  /** Object key or array index; null identifies the root. */
  readonly name: string | null;
  /** Zero-based depth from the root. */
  readonly depth: number;
  /** Maximum depth rendered as interactive child nodes. */
  readonly maxDepth: number;
  /** Number of child entries revealed in one step. */
  readonly pageSize: number;
  /** Maximum initial scalar text length. */
  readonly maxValueLength: number;
  /** Resolved interface text from the owning viewer. */
  readonly text: QuireKitJsonViewerMessages;
}

const props = defineProps<Props>();
const open = ref(props.depth === 0);
const visibleCount = ref(props.pageSize);
const scalarExpanded = ref(false);
const isBranch = computed(() => props.value !== null && typeof props.value === 'object');
const entries = computed(() => {
  if (!isBranch.value) return [];
  return Array.isArray(props.value)
    ? props.value.map((value: unknown, index: number) => [String(index), value] as const)
    : Object.entries(props.value as Record<string, unknown>);
});
const visibleEntries = computed(() => entries.value.slice(0, visibleCount.value));
const isArray = computed(() => Array.isArray(props.value));
const scalar = computed(() => JSON.stringify(props.value) ?? 'null');
const scalarText = computed(() => scalarExpanded.value || scalar.value.length <= props.maxValueLength
  ? scalar.value : `${scalar.value.slice(0, props.maxValueLength)}…`);

/** Reveal another bounded page without rebuilding unopened descendants. */
function showMore(): void {
  visibleCount.value = Math.min(entries.value.length, visibleCount.value + props.pageSize);
}

/** Tracks native details disclosure so unopened descendants are not mounted. @param event - Native toggle event. */
function onToggle(event: Event): void {
  open.value = (event.currentTarget as HTMLDetailsElement).open;
}
</script>

<template>
  <div class="qk-json-viewer__node" :style="{ '--qk-json-depth': depth }">
    <details v-if="isBranch" class="qk-json-viewer__branch" :open="open" @toggle="onToggle">
      <summary class="qk-json-viewer__summary">
        <span v-if="name !== null" class="qk-json-viewer__key">{{ name }}<span class="qk-json-viewer__punctuation">: </span></span>
        <span class="qk-json-viewer__punctuation">{{ isArray ? '[' : '{' }}</span>
        <span class="qk-json-viewer__count">{{ text.entries(entries.length) }}</span>
      </summary>
      <template v-if="open && depth < maxDepth">
        <JsonNode v-for="[key, child] in visibleEntries" :key="key" :name="key" :value="child" :depth="depth + 1"
          :max-depth="maxDepth" :page-size="pageSize" :max-value-length="maxValueLength" :text="text" />
        <button v-if="visibleCount < entries.length" type="button" class="qk-json-viewer__more"
          :style="{ '--qk-json-depth': depth + 1 }" @click="showMore">{{ text.showMore(Math.min(pageSize, entries.length - visibleCount)) }}</button>
      </template>
      <div v-else-if="open" class="qk-json-viewer__limit" :style="{ '--qk-json-depth': depth + 1 }">{{ text.depthLimit }}</div>
      <div v-if="open" class="qk-json-viewer__close" :style="{ '--qk-json-depth': depth }">{{ isArray ? ']' : '}' }}</div>
    </details>
    <div v-else class="qk-json-viewer__scalar">
      <span v-if="name !== null" class="qk-json-viewer__key">{{ name }}<span class="qk-json-viewer__punctuation">: </span></span>
      <span :data-kind="value === null ? 'null' : typeof value" class="qk-json-viewer__value">{{ scalarText }}</span>
      <button v-if="scalar.length > maxValueLength" type="button" class="qk-json-viewer__more"
        @click="scalarExpanded = !scalarExpanded">{{ scalarExpanded ? text.collapseValue : text.expandValue }}</button>
    </div>
  </div>
</template>
