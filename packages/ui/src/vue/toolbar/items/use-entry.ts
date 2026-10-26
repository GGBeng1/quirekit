import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent } from "../../../components/toolbar/types";
import type { QuireKitToolbarRendererScope } from "./types";

/**
 * Owns local popup state and validates intents against the current entry.
 * @param entry - Current immutable entry and ancestry supplied by the host renderer.
 * @param execute - Accepted command intent sink.
 * @param openChange - Popup transition sink.
 * @returns Live bindings for built-in controls and custom renderers.
 */
export function useToolbarEntry(
  entry: () => { item: QuireKitToolbarEntry; path: readonly string[]; disabled: boolean; context: unknown },
  execute: (event: QuireKitToolbarExecuteEvent) => void,
  openChange: (event: QuireKitToolbarOpenChangeEvent) => void
) {
  const localOpen = ref(entry().item.expanded ?? false);
  let pendingOpen: boolean | undefined;
  let mounted = true;
  onBeforeUnmount(() => { mounted = false; });
  const unavailable = computed(() => entry().disabled || !!entry().item.disabled || !!entry().item.hidden);
  const expanded = computed(() => !unavailable.value && !entry().item.disclosureDisabled && (entry().item.expanded ?? localOpen.value));
  /** @param next - Requested popup state. */
  function setExpanded(next: boolean): void {
    if (!mounted || (next && (unavailable.value || entry().item.disclosureDisabled))) return;
    if (next === pendingOpen || next === (entry().item.expanded ?? localOpen.value)) return;
    // Trigger and overlay may report the same click; publish one host intent per transition.
    pendingOpen = next;
    void nextTick(() => { pendingOpen = undefined; });
    localOpen.value = next;
    openChange({ item: entry().item, path: entry().path, expanded: next });
  }
  watch(() => entry().item.expanded, value => { if (value !== undefined) localOpen.value = value; });
  watch(() => unavailable.value || !!entry().item.disclosureDisabled, blocked => {
    if (blocked && (localOpen.value || entry().item.expanded)) setExpanded(false);
  });
  /**
   * Rechecks availability when a delayed/custom callback submits a command.
   * @param source - Originating interaction.
   * @param payload - Submitted parameters, defaulting to entry parameters.
   * @param value - Menu leaf identity, otherwise entry identity.
   * @param pressed - Requested toggle state.
   * @param nativeEvent - Original native activation for host focus restoration.
   */
  function dispatch(source: QuireKitToolbarExecuteEvent["source"], payload: unknown = entry().item.payload, value = entry().item.value, pressed?: boolean, nativeEvent?: Event): void {
    if (!mounted || unavailable.value || (source === "action" && entry().item.actionDisabled)
      || (source === "popup" && (!expanded.value || entry().item.disclosureDisabled))) return;
    const { item, path } = entry();
    execute({ item, value, path: source === "menu" ? [...path, value] : path, source, payload,
      ...(pressed === undefined ? {} : { pressed }), ...(nativeEvent === undefined ? {} : { nativeEvent }) });
  }
  const scope = computed<QuireKitToolbarRendererScope>(() => ({
    ...entry(), disabled: unavailable.value, expanded: expanded.value, setExpanded,
    execute: (payload, nativeEvent) => dispatch(entry().item.kind === "custom" ? "custom" : "popup", payload, entry().item.value, undefined, nativeEvent)
  }));
  return { unavailable, expanded, setExpanded, dispatch, scope };
}
