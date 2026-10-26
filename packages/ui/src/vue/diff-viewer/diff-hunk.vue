<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuireKitMessages } from '../locale-provider/context';
import type { DiffHunk, DiffRow } from './types';

/** A single independently collapsible unified-diff hunk. */
interface Props {
  /** Verified hunk and its old/new line numbers. */
  readonly hunk: DiffHunk;
  /** Maximum initially visible row count. */
  readonly maxVisibleLines: number;
}

const props = defineProps<Props>();
const text = useQuireKitMessages('diffViewer');
const open = ref(true);
const showAll = ref(false);
const windowStart = computed(() => {
  const rows = props.hunk.rows;
  if (showAll.value || rows.length <= props.maxVisibleLines) return 0;
  const firstChange = rows.findIndex(row => row.kind === 'added' || row.kind === 'removed');
  if (firstChange < 0) return 0;
  let lastChange = firstChange;
  for (let index = rows.length - 1; index > firstChange; index--) {
    if (rows[index]?.kind === 'added' || rows[index]?.kind === 'removed') {
      lastChange = index;
      break;
    }
  }
  const span = lastChange - firstChange + 1;
  // Keep the first change group in view. Context gets the remaining budget,
  // instead of letting a long preamble hide every meaningful changed line.
  return Math.min(rows.length - props.maxVisibleLines,
    Math.max(0, firstChange - Math.floor(Math.max(0, props.maxVisibleLines - span) / 2)));
});
const windowEnd = computed(() => showAll.value ? props.hunk.rows.length
  : Math.min(props.hunk.rows.length, windowStart.value + props.maxVisibleLines));
const visibleRows = computed(() => props.hunk.rows.slice(windowStart.value, windowEnd.value));
const leadingHidden = computed(() => windowStart.value);
/** Digits of the widest line number, so both gutters fit every row of the hunk. */
const numberDigits = computed(() => String(Math.max(1, ...props.hunk.rows.flatMap(row => [row.oldNumber ?? 0, row.newNumber ?? 0]))).length);
const trailingHidden = computed(() => props.hunk.rows.length - windowEnd.value);

/** Presents a blank gutter for lines absent from one side of the patch. */
function numberText(value: DiffRow['oldNumber']): string {
  return value === null ? '' : String(value);
}
</script>

<template>
  <section class="qk-diff-viewer__hunk" :aria-label="text.hunk(hunk.index + 1)">
    <button type="button" class="qk-diff-viewer__hunk-toggle" :aria-expanded="open" @click="open = !open">
      <span class="qk-diff-viewer__chevron" aria-hidden="true">{{ open ? '⌄' : '›' }}</span>
      <span class="qk-diff-viewer__hunk-header">{{ hunk.header }}</span>
      <span class="qk-diff-viewer__hunk-count">+{{ hunk.additions }} −{{ hunk.removals }}</span>
    </button>
    <div v-if="open" class="qk-diff-viewer__hunk-body" :style="{ '--qk-diff-number-digits': numberDigits }">
      <button v-if="leadingHidden" type="button" class="qk-diff-viewer__reveal" @click="showAll = true">
        {{ text.revealBefore(leadingHidden) }}
      </button>
      <div v-for="(row, index) in visibleRows" :key="windowStart + index" class="qk-diff-viewer__line" :data-kind="row.kind">
        <span class="qk-diff-viewer__number" :aria-label="row.oldNumber === null ? undefined : text.oldLine(row.oldNumber)">{{ numberText(row.oldNumber) }}</span>
        <span class="qk-diff-viewer__number" :aria-label="row.newNumber === null ? undefined : text.newLine(row.newNumber)">{{ numberText(row.newNumber) }}</span>
        <span class="qk-diff-viewer__marker" :aria-label="row.kind === 'added' ? text.added : row.kind === 'removed' ? text.removed : undefined"
          :aria-hidden="row.kind === 'context' || row.kind === 'note' ? true : undefined">{{ row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' ' }}</span>
        <span class="qk-diff-viewer__text">{{ row.text }}</span>
      </div>
      <button v-if="trailingHidden" type="button" class="qk-diff-viewer__reveal" @click="showAll = true">
        {{ text.revealAfter(trailingHidden) }}
      </button>
    </div>
  </section>
</template>
