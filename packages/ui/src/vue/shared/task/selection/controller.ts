import { computed, nextTick, ref, shallowRef, watch } from "vue";
import type { TaskSelectionItem, TaskSelectionOptions, TaskSelectionRequest } from "./types";
import { copySelection, equalSelection, isSelectionAvailable } from "./value";
import { useSelectionQuery } from "./query";

/**
 * Owns committed/local value, a disposable draft, and one cancellable business submission.
 * @param options - Host projections and the existing task request owner.
 * @returns Widget-independent selection behavior shared by adaptive selection tasks.
 */
export function useTaskSelection<T extends TaskSelectionItem>(options: TaskSelectionOptions<T>) {
  const { props, requests, events } = options;
  const local = ref(copySelection(props.defaultValue ?? []));
  const committed = computed(() => copySelection(props.modelValue ?? local.value));
  const baseline = ref<string[]>([]);
  const draft = ref<string[]>([]);
  const highlighted = ref<string | null>(null);
  const failed = ref(false);
  const invalid = ref(false);
  const labels = shallowRef(new Map<string, string>());
  const query = useSelectionQuery(options);
  const explicit = computed(() => props.selectionMode === "multiple" || props.commitMode === "explicit");
  let publishing = false;

  /** Copies current authoritative values without replacing the surrounding input or widget. */
  function syncValue(): void { baseline.value = [...committed.value]; draft.value = [...committed.value]; failed.value = false; invalid.value = false; }
  /** Starts or discards one private draft without executing business or query callbacks. */
  function reset(): void { syncValue(); highlighted.value = null; query.reset(); }

  watch(() => [props.selectionMode, props.commitMode], () => {
    if (props.selectionMode === "multiple" && props.commitMode === "immediate") throw new TypeError("Multiple selection requires explicit confirmation.");
  }, { immediate: true, flush: "sync" });
  watch(committed, (value, previous) => {
    if (equalSelection(value, previous) || publishing) return;
    requests.cancelSubmission(); syncValue();
  }, { flush: "sync" });
  // Keep only current candidates and selected labels: remote filtering can hide a
  // selection, but a long-running task must not accumulate every search result.
  watch([() => props.items, committed, draft], () => {
    const retained = new Set([...committed.value, ...draft.value]);
    const next = new Map([...labels.value].filter(([value]) => retained.has(value)));
    for (const item of props.items) next.set(item.value, item.label);
    labels.value = next;
  }, { immediate: true, deep: true });
  const summary = computed(() => committed.value.map(value => labels.value.get(value) ?? value).join("、"));
  const unknown = computed(() => draft.value.filter(value => !labels.value.has(value)));

  /** @returns Completion of a current submission; stale results have no outward effect. */
  async function confirm(): Promise<void> {
    if (props.disabled || query.composing.value || !requests.sessionId.value || requests.submitting.value) return;
    if (!isSelectionAvailable(draft.value, baseline.value, props.items)) { invalid.value = true; return; }
    const context = requests.startSubmission();
    if (!context) return;
    const request: TaskSelectionRequest = Object.freeze({ ...context, value: Object.freeze([...draft.value]), previousValue: Object.freeze([...baseline.value]) });
    failed.value = false; invalid.value = false;
    try {
      const result = props.submit?.(request);
      if (result) await result;
      if (!requests.isCurrent(request, "submission")) return;
      // Keep the lock while notifying synchronous consumers. A model echo is not
      // an external replacement and must not abort the just-completed operation.
      publishing = true;
      try {
        if (props.modelValue === undefined) local.value = [...request.value];
        events.updateValue(request.value);
        events.commit(request);
      } finally { publishing = false; }
      requests.finishSubmission(request);
      await nextTick();
      if (requests.sessionId.value !== request.sessionId) return;
      syncValue();
      events.success();
    } catch (error) {
      if (!requests.isCurrent(request, "submission")) return;
      requests.finishSubmission(request);
      if (error instanceof Error && error.name === "AbortError") return;
      failed.value = true; events.error({ error, request });
    }
  }
  /** @param value - Complete selection emitted by the existing Listbox widget. */
  function select(value: readonly string[] | undefined): void {
    if (props.disabled || query.composing.value || requests.submitting.value || !requests.sessionId.value) return;
    const next = copySelection(value ?? []);
    if ((props.selectionMode !== "multiple" && next.length > 1) || !isSelectionAvailable(next, baseline.value, props.items)) return;
    draft.value = next; failed.value = false; invalid.value = false;
    if (!explicit.value) void confirm();
  }
  return { committed, baseline, draft, highlighted, failed, invalid, summary, unknown, explicit, query, reset, select, confirm };
}
