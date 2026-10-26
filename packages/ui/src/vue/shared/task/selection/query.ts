import { computed, ref, watch } from "vue";
import type { TaskSelectionItem, TaskSelectionOptions } from "./types";

/**
 * Keeps incomplete IME text local and emits only complete, independently cancelled queries.
 * @param options - Shared selection dependencies.
 * @returns Query projection and native input boundaries without a separate search machine.
 */
export function useSelectionQuery<T extends TaskSelectionItem>({ props, requests, events }: TaskSelectionOptions<T>) {
  const local = ref(props.defaultQuery ?? "");
  const composing = ref(false);
  const compositionText = ref("");
  let lastInput: string | undefined;
  const query = computed(() => composing.value ? compositionText.value : props.query ?? local.value);
  const visibleItems = computed(() => {
    const text = (props.query ?? local.value).trim().toLocaleLowerCase();
    if (!text || props.filter === "none") return props.items;
    return props.items.filter(item => [item.label, ...(item.keywords ?? [])].some(term => {
      const candidate = term.toLocaleLowerCase();
      return props.filter === "startsWith" ? candidate.startsWith(text) : candidate.includes(text);
    }));
  });

  /** Resets private query state without replaying the host's search callback. */
  function reset(): void {
    composing.value = false; local.value = props.defaultQuery ?? ""; lastInput = undefined;
  }
  /** @param value - Native input value including intermediate composition text. */
  function input(value: string): void {
    if (props.disabled || requests.submitting.value || !requests.sessionId.value) return;
    if (composing.value) { compositionText.value = value; return; }
    if (lastInput === value) return;
    lastInput = value;
    if (props.query === undefined) local.value = value;
    events.updateQuery(value);
    const context = requests.startSearch();
    if (context) events.search(Object.freeze({ ...context, query: value }));
  }
  /** Starts native composition without publishing incomplete search intent. */
  function compositionStart(): void { compositionText.value = query.value; composing.value = true; }
  /** @param event - The original composition end carrying complete input text. */
  function compositionEnd(event: CompositionEvent): void {
    composing.value = false;
    input((event.target as HTMLInputElement).value);
  }
  watch(() => props.query, value => {
    if (value === lastInput) return;
    lastInput = undefined; requests.cancelSearch();
  }, { flush: "sync" });
  return { query, composing, visibleItems, reset, input, compositionStart, compositionEnd };
}
