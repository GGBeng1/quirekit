import { computed, onBeforeUnmount, ref } from 'vue';
import type { QuireKitChatInputCandidate, QuireKitChatInputQuery, QuireKitChatInputToken } from '../../../components/chat/rich-input/types';
import { findChatInputQuery } from './model';

/** Coordinate asynchronous feature candidates without transferring text ownership. */
export function useChatInputCandidates(resolve: (query: QuireKitChatInputQuery, signal: AbortSignal) => readonly QuireKitChatInputCandidate[] | Promise<readonly QuireKitChatInputCandidate[]>,
  onError: (error: unknown) => void) {
  const query = ref<QuireKitChatInputQuery | null>(null);
  const items = ref<readonly QuireKitChatInputCandidate[]>([]);
  const activeIndex = ref(-1);
  const loading = ref(false);
  const dismissed = ref('');
  let controller: AbortController | null = null;
  let generation = 0;

  /** Stable signature for one visible query.
   * @param value - Query to identify.
   * @returns Signature including range and search text.
   */
  function signature(value: QuireKitChatInputQuery | null): string {
    return value ? `${value.kind}:${value.from}:${value.to}:${value.search}` : '';
  }

  /** Stop stale work and discard the previous visible query. */
  function clear(): void {
    controller?.abort(); controller = null; generation++;
    query.value = null; items.value = []; activeIndex.value = -1; loading.value = false;
  }

  /** Resolve candidates for the caret, aborting prior and rejecting late replies.
   * @param text - Current literal text.
   * @param caret - Collapsed selection position, or null for a range.
   * @param tokens - Resolved references.
   */
  function refresh(text: string, caret: number | null, tokens: readonly QuireKitChatInputToken[]): void {
    const next = caret === null ? null : findChatInputQuery(text, caret, tokens);
    if (signature(next) === signature(query.value)) return;
    if (signature(next) !== dismissed.value) dismissed.value = '';
    clear();
    if (!next || signature(next) === dismissed.value) return;
    query.value = next;
    controller = new AbortController();
    const activeController = controller;
    const request = ++generation;
    loading.value = true;
    Promise.resolve().then(() => activeController.signal.aborted ? [] : resolve(next, activeController.signal)).then(result => {
      if (request !== generation || controller?.signal.aborted) return;
      items.value = result;
      activeIndex.value = result.findIndex(item => !item.disabled);
    }).catch(error => {
      if (request === generation && !controller?.signal.aborted) {
        items.value = []; activeIndex.value = -1;
        onError(error);
      }
    }).finally(() => { if (request === generation) loading.value = false; });
  }

  /** Hide the current query until its text or caret changes. */
  function dismiss(): void {
    dismissed.value = signature(query.value);
    clear();
  }

  /** Move through enabled options while focus stays in the input.
   * @param direction - Relative movement.
   */
  function move(direction: -1 | 1): void {
    if (!items.value.some(item => !item.disabled)) return;
    let index = activeIndex.value;
    for (let attempts = 0; attempts < items.value.length; attempts++) {
      index = (index + direction + items.value.length) % items.value.length;
      if (!items.value[index]?.disabled) { activeIndex.value = index; return; }
    }
  }

  onBeforeUnmount(clear);
  return { query, items, activeIndex, loading, active: computed(() => items.value[activeIndex.value]), refresh, clear, dismiss, move };
}
