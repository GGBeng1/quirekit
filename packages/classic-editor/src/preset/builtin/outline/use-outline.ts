import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from "vue";
import type { QuireEditorTransactionEvent } from "@quirekit/core";
import type { QuireKitTreeViewExpandedChangeDetails, QuireKitTreeViewSelectionChangeDetails } from "@quirekit/ui";
import type { ClassicEditorRenderContext } from "@classic/types";
import { sortOutlineAnchors } from "./active-heading";
import { createClassicEditorOutlineOccurrences } from "./occurrences";
import { useClassicEditorOutlineHostVisible } from "./use-host-visible";
import { useClassicEditorOutlineScrollFollow } from "./use-scroll-follow";
import type { ClassicEditorOutlineTree } from "./types";

/**
 * Owns outline transaction subscriptions and controlled tree interaction state.
 * @param context - Current mounted editor and style/localization dependencies.
 * @param untitledLabel - Current localized empty-heading label.
 * @returns Stable nodes, live navigation and retained expansion/selection controls.
 */
export function useClassicEditorOutline(
  context: Readonly<Ref<ClassicEditorRenderContext>>,
  untitledLabel: Readonly<Ref<string>>
) {
  const editor = computed(() => context.value.editor);
  const revision = ref(0);
  const registry = shallowRef(createClassicEditorOutlineOccurrences(editor.value.state.doc));
  let subscribed = editor.value;
  /** @param event - Root and appended transactions already accepted by Core. */
  function applyBatch(event: QuireEditorTransactionEvent): void {
    registry.value.applyBatch(event);
    revision.value += 1;
  }
  watch(editor, (current, previous) => {
    previous?.off("transaction", applyBatch);
    subscribed = current;
    if (previous !== undefined) registry.value = createClassicEditorOutlineOccurrences(current.state.doc);
    subscribed.on("transaction", applyBatch);
  }, { immediate: true, flush: "sync" });
  onBeforeUnmount(() => subscribed.off("transaction", applyBatch));
  const visible = useClassicEditorOutlineHostVisible();
  let presented: ClassicEditorOutlineTree | undefined;
  // A hidden panel keeps its last tree while the registry maps edits; showing it projects once.
  const tree = computed(() => {
    revision.value;
    if (!visible.value && presented !== undefined) return presented;
    presented = registry.value.project(context.value, untitledLabel.value);
    return presented;
  });
  const nodes = computed(() => tree.value.nodes);
  const expandedValue = ref<string[]>([]);
  const selectedValue = ref<string[]>([]);
  let previousBranches = new Set<string>();
  watch(tree, current => {
    const branches = new Set(current.defaultExpandedValue);
    const expanded = expandedValue.value.filter(id => branches.has(id));
    for (const id of branches) if (!previousBranches.has(id)) expanded.push(id);
    expandedValue.value = retainValues(expandedValue.value, expanded);
    selectedValue.value = retainValues(selectedValue.value, selectedValue.value.filter(id => current.positions.has(id)));
    previousBranches = branches;
  }, { immediate: true });

  const anchors = computed(() => sortOutlineAnchors(tree.value.positions));
  const follow = useClassicEditorOutlineScrollFollow(editor, anchors, (id) => {
    selectedValue.value = retainValues(selectedValue.value, [id]);
  }, visible);

  /** @param details - Controlled branch changes from the public TreeView. */
  function changeExpanded(details: QuireKitTreeViewExpandedChangeDetails): void {
    const branches = new Set(tree.value.defaultExpandedValue);
    expandedValue.value = [...details.expandedValue].filter(id => branches.has(id));
  }

  /** @param details - Controlled selection and navigation from the public TreeView. */
  function selectHeading(details: QuireKitTreeViewSelectionChangeDetails): void {
    const positions = tree.value.positions;
    selectedValue.value = [...details.selectedValue].filter(id => positions.has(id));
    const id = selectedValue.value[0];
    const position = id === undefined ? undefined : positions.get(id);
    if (position === undefined) return;
    follow.pauseForNavigation();
    // Like a navigation pane, the heading lands near the top rather than at the nearest edge.
    editor.value.commands.focus(position + 1, { scrollIntoView: false });
    editor.value.view.scrollRangeIntoView({ from: position + 1, to: position + 1 }, { block: "start", margin: 24 });
  }
  return { nodes, expandedValue, selectedValue, changeExpanded, selectHeading };
}

/** @param previous - Current controlled values. @param next - Pruned or initialized values. @returns Existing array when no state changed. */
function retainValues(previous: string[], next: string[]): string[] {
  return previous.length === next.length && previous.every((value, index) => value === next[index]) ? previous : next;
}
