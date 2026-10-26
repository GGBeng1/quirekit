import { computed, ref } from 'vue';
import { hierarchyEntries, prepareHierarchy } from './data';
import type { QuireKitHierarchyPickerProps } from './types';

/** Shared field state; browsing and search never write the committed selection.
 * @param props - Reactive public field props.
 * @param onValue - Selection notification.
 * @param onOpen - Popup notification.
 * @returns Prepared data, independent popup/query state and explicit commit boundaries.
 */
export function useHierarchyPicker(props: QuireKitHierarchyPickerProps, onValue: (value: string[]) => void, onOpen: (open: boolean) => void) {
  const internal = ref([...(props.defaultValue ?? [])]);
  const localOpen = ref(props.defaultOpen ?? false);
  const query = ref('');
  const value = computed(() => props.modelValue ?? internal.value);
  const nodes = computed(() => prepareHierarchy(props.nodes));
  const entries = computed(() => hierarchyEntries(nodes.value));
  const open = computed(() => !props.disabled && !props.readOnly && (props.open ?? localOpen.value));
  /** @param next - Requested popup state. */
  function setOpen(next: boolean): void {
    if (next && (props.disabled || props.readOnly)) return;
    localOpen.value = next;
    if (!next) query.value = '';
    onOpen(next);
  }
  /** @param next - Explicit committed ids. */
  function commit(next: string[]): void {
    if (props.disabled || props.readOnly) return;
    internal.value = next;
    onValue(next);
  }
  /** Restores the native form's initial value even when the field is read-only. */
  function reset(): void {
    internal.value = [...(props.defaultValue ?? [])];
    onValue(internal.value);
    setOpen(false);
  }
  return { value, nodes, entries, open, query, setOpen, commit, reset };
}
