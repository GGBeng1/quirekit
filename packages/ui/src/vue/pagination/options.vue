<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { QuireKitPaginationSize } from '../../components/pagination';
import QuireInput from '../input/input.vue';
import QuireSelect from '../select/select.vue';
import { useQuireKitMessages } from '../locale-provider/context';

/** Optional data-navigation controls share the parent pagination state. */
interface Props {
  /** Committed current page. */
  page: number;
  /** Committed page size. */
  pageSize: number;
  /** Number of available pages. */
  totalPages: number;
  /** Context used in accessible field labels. */
  label: string;
  /** Visual control size. */
  size: QuireKitPaginationSize;
  /** Whether all actions are unavailable. */
  disabled: boolean;
  /** Which independently positioned control to render. */
  part: "pageSize" | "jumper";
  /** Permitted page-size candidates. */
  pageSizeOptions: readonly number[];
}
/** User-committed changes passed back to Ark Pagination. */
interface Emits {
  /** A complete valid page request. */
  pageChange: [page: number];
  /** A selected page size. */
  pageSizeChange: [pageSize: number];
}
const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const text = useQuireKitMessages('pagination');
const draft = ref(String(props.page));
// 宽度由总页数决定，输入草稿和翻页时不跳动；保留控件 token 的最小宽度。
const jumpWidth = computed(() => `max(var(--qk-control-large), calc(${Math.max(2, String(props.totalPages).length)}ch + 2 * var(--qk-space-inline) + 2 * var(--qk-border-width-default)))`);
const items = computed(() => [...new Set([...props.pageSizeOptions, props.pageSize])]
  .filter(value => Number.isSafeInteger(value) && value > 0).sort((a, b) => a - b)
  .map(value => ({ value: String(value), label: text.value.perPage(value) })));
watch(() => [props.page, props.totalPages], () => { draft.value = String(props.page); });

/** Commit complete integers only; typing never changes the result set. */
function commit(): void {
  if (props.disabled) return;
  const value = Number(draft.value.trim());
  const target = draft.value.trim() && Number.isSafeInteger(value)
    ? Math.max(1, Math.min(value, Math.max(1, props.totalPages))) : props.page;
  draft.value = String(target);
  if (target !== props.page) emit('pageChange', target);
}
/**
 * Preserve composition, cancel drafts with Escape, and submit on Enter.
 * @param event - Native input keyboard event.
 */
function keydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.key === 'Enter') { event.preventDefault(); commit(); }
  if (event.key === 'Escape') { event.preventDefault(); draft.value = String(props.page); }
}
/**
 * Submit only one of the validated selector options.
 * @param value - Selected string representation of the page size.
 */
function resize(value: string | undefined): void {
  if (!props.disabled && value && items.value.some(item => item.value === value) && Number(value) !== props.pageSize) emit('pageSizeChange', Number(value));
}
</script>

<template>
  <QuireSelect v-if="part === 'pageSize'" :model-value="String(pageSize)" :items="items" :label="text.pageSize(label)" :size="size" width="max-content" :disabled="disabled" @update:model-value="resize" />
  <div v-else class="qk-pagination__jumper">
    <span v-if="text.jumpPrefix">{{ text.jumpPrefix }}</span>
    <QuireInput v-model="draft" :size="size" :width="jumpWidth" text-align="center" :aria-label="text.jumpInput(label)" inputmode="numeric" autocomplete="off" :disabled="disabled || totalPages <= 1" @keydown="keydown" @blur="commit" />
    <span v-if="text.jumpSuffix">{{ text.jumpSuffix }}</span>
  </div>
</template>
