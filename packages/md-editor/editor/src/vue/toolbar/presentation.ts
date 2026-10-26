import { shallowRef, watch, type Ref } from "vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { MsfeEditor } from "@quirekit/msfe-core";

/**
 * Observe the toolbar's breakpoint once per mounted source owner.
 * @param editor - Reactive native editor owner, including iframe documents.
 * @param narrow - Optional shared breakpoint state, created before native initialization.
 * @returns Whether the compact toolbar should be presented.
 */
export function useNarrowToolbar(editor: () => MsfeEditor | null | undefined, narrow = shallowRef(false)): Ref<boolean> {
  watch(editor, (owner, _previous, cleanup) => {
    const query = owner?.element.ownerDocument.defaultView?.matchMedia("(max-width: 767px)");
    /** Apply only breakpoint changes; input transactions never reread width. */
    function update(): void { narrow.value = !!query?.matches; }
    update();
    query?.addEventListener("change", update);
    cleanup(() => query?.removeEventListener("change", update));
  }, { immediate: true });
  return narrow;
}

/**
 * Keep primary tasks ahead of the public Toolbar's trailing-group collapse.
 * @param entries - Original controls and execution identities.
 * @returns The same entries, with history, style and insertion first.
 */
export function compactToolbarItems(entries: readonly QuireKitToolbarEntry[]): readonly QuireKitToolbarEntry[] {
  const primary = ["history", "heading", "insert"];
  return [...primary.flatMap(value => entries.filter(entry => entry.value === value)),
    ...entries.filter(entry => !primary.includes(entry.value))];
}

/** Selection toolbar contents: text style, inline formats, link and comment, in product order. */
const selectionEntries = ["heading", "format", "link", "comment"];
/** Inline formats kept in the selection toolbar; the rest stay in the fixed toolbar and slash menu. */
const selectionFormats = ["bold", "emphasis", "strike", "insertedText", "inlineCode", "highlight"];

/**
 * Reduce the full product toolbar to the floating selection toolbar.
 * @param entries - Original controls and execution identities.
 * @param readOnly - Source cannot change; only text-neutral actions such as comments remain.
 * @returns Style field, primary inline formats, link and comment, separated as groups.
 */
export function selectionToolbarItems(entries: readonly QuireKitToolbarEntry[], readOnly = false): readonly QuireKitToolbarEntry[] {
  const picked = (readOnly ? ["comment"] : selectionEntries).flatMap(value => entries.filter(entry => entry.value === value && !entry.hidden)).map(entry => entry.value === "format" && entry.children
    ? { ...entry, children: entry.children.filter(child => selectionFormats.includes(child.value)) } : entry);
  return picked.flatMap((entry, index) => index ? [{ value: `${entry.value}-start`, label: "", kind: "separator" as const }, entry] : [entry]);
}
