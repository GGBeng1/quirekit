import { useMindEditorMessages } from "../messages";
import { nextTick, ref, shallowRef } from "vue";
import type { MindMapEditor, MindMapEditorState } from "@quirekit/mind-map-simple";
import type { MindMapAnnotation } from "@quirekit/mind-map";
import type { MindEditorPanelName } from "./types";
import type { MindEditorDetailRequest } from "../details/types";
import { v4 as uuidv4 } from "uuid";

/** @param editor - Current public controller. @param state - Small command state. @param returnFocus - Focus after the lazy panel unmounts. @returns Panel intentions without document subscriptions. */
export function useMindEditorPanels(editor: () => MindMapEditor | undefined, state: MindMapEditorState, returnFocus: () => void) {
  const { t } = useMindEditorMessages();
  const name = ref<MindEditorPanelName | null>(null);
  const detailRequest = shallowRef<MindEditorDetailRequest | null>(null);
  const annotationId = ref<string>();
  /** Closes the current panel before returning keyboard ownership to the canvas. */
  function close(): void { name.value = null; void nextTick(() => { if (!name.value) returnFocus(); }); }
  /** @param value - A panel or explicit field intent. @param force - Open instead of toggling. @returns Whether the intent belongs to this controller. */
  function open(value: string, force = false): boolean {
    if (value.startsWith("detail:")) {
      const field = value.slice(7);
      if (!["image", "link", "note", "marker"].includes(field)) return false;
      if (state.readOnly || state.busy || state.composing || !state.selectedCount || field !== "marker" && state.selectedCount !== 1) return true;
      detailRequest.value = { field: field as MindEditorDetailRequest["field"] };
      name.value = "details"; return true;
    }
    if (!["files", "find", "format", "details", "annotations"].includes(value)) return false;
    if (name.value === value && !force) close();
    else {
      detailRequest.value = null; annotationId.value = undefined;
      name.value = value as MindEditorPanelName;
    }
    return true;
  }
  /** @param value - An explicit relationship creation intent. @returns Completion of one existing atomic annotation command. */
  async function insertAnnotation(value: string): Promise<void> {
    const instance = editor(), kind = value.slice(11);
    if (!instance || state.readOnly || state.busy || state.composing || !["relation", "summary", "boundary"].includes(kind)) return;
    const ids = instance.getSelectedTopicIds();
    if (!ids.length || kind === "relation" && ids.length !== 2) return;
    const id = `annotation-${uuidv4()}`, labels = { relation: t("relationship"), summary: t("summary"), boundary: t("boundary") };
    const base = { id, text: labels[kind as keyof typeof labels] };
    const item: MindMapAnnotation = kind === "relation" ? { ...base, kind, from: ids[0]!, to: ids[1]! }
      : { ...base, kind: kind as "summary" | "boundary", topicIds: [...ids] };
    await instance.putAnnotation(item);
    // A host replacement may complete while the command is pending. Never open an
    // old document's properties in the next editor lifetime.
    if (editor() !== instance) return;
    annotationId.value = id; name.value = "annotations";
  }
  return { name, detailRequest, annotationId, close, open, insertAnnotation };
}
