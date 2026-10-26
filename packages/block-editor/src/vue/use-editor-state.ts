import { computed, onBeforeUnmount, ref, shallowRef } from "vue";
import type { EditorEvents } from "@quirekit/core";
import { readFormatPainterState, type CharacterCountStorage } from "@quirekit/extensions";
import type { BlockEditorInstance } from "../runtime";
import { readBlockFormatting } from "../ui/state/format";
import { readBlockOutline, updateBlockOutline } from "../ui/state/outline";
import type { BlockOutlineEntry } from "../ui/state/types";
import { readBlockParagraphFeature } from "../paragraph/feature";
import { useBlockLocale } from "./localization/use-locale";
import { readBlockListFeature } from "../lists/feature";

/**
 * Maintains visible product projections with one canonical transaction listener.
 * @param instance - Stable Core session borrowed by the component.
 * @param onChange - Host dirty-state notification; never serializes content.
 * @returns Reactive product state and explicit user actions.
 */
export function useBlockEditorState(instance: BlockEditorInstance, onChange: () => void) {
  const editor = instance.editor;
  const lists = readBlockListFeature(editor), paragraphs = readBlockParagraphFeature(editor);
  let previous = editor.state.pm;
  const format = shallowRef(readBlockFormatting(previous, 256, lists, paragraphs));
  const headings = shallowRef<readonly BlockOutlineEntry[]>([]);
  const outlineOpen = ref(false);
  const editable = ref(editor.isEditable);
  const undo = ref(editor.can().undo());
  const redo = ref(editor.can().redo());
  const head = ref(previous.selection.head);
  const { t } = useBlockLocale();
  const totals = ref<{ characters: number; words: number } | false | null>(null);
  const statistics = computed(() => totals.value === null ? "" : totals.value === false ? t("未启用字数统计") : t("{characters} 字符 · {words} 词", totals.value));

  /** @param event - Already accepted canonical transaction batch. */
  function sync(event: EditorEvents["transaction"]): void {
    const state = editor.state.pm;
    const changed = previous.doc !== state.doc;
    const previousPainter = readFormatPainterState(previous), painter = readFormatPainterState(state);
    if (changed || !previous.selection.eq(state.selection) || previous.storedMarks !== state.storedMarks) {
      format.value = readBlockFormatting(state, 256, lists, paragraphs);
      head.value = state.selection.head;
    }
    else if (previousPainter.mode !== painter.mode || previousPainter.hasSnapshot !== painter.hasSnapshot) {
      format.value = { ...format.value, painter: painter.mode !== "off", hasCopiedFormat: painter.hasSnapshot };
    }
    if (changed) {
      if (outlineOpen.value) {
        for (const transaction of [event.transaction, ...event.appendedTransactions]) {
          headings.value = updateBlockOutline(headings.value, transaction);
        }
      }
      totals.value = null;
      onChange();
    }
    editable.value = editor.isEditable;
    undo.value = editor.can().undo();
    redo.value = editor.can().redo();
    previous = state;
  }
  editor.on("transaction", sync);
  onBeforeUnmount(() => editor.off("transaction", sync));

  /** @param open - Whether the outline is actually consumed. */
  function setOutlineOpen(open: boolean): void {
    if (open && !outlineOpen.value) headings.value = readBlockOutline(editor.state.doc);
    outlineOpen.value = open;
    if (!open) headings.value = [];
  }
  /** Switches the existing Core editing policy. */
  function toggleEditable(): void {
    editor.setEditable(!editor.isEditable);
    editable.value = editor.isEditable;
  }
  /** Performs a full-document count only on the user's explicit request. */
  function count(): void {
    const counter = editor.storage.characterCount as CharacterCountStorage | undefined;
    totals.value = counter ? { characters: counter.characters(), words: counter.words() } : false;
  }
  /** @param pos - Current semantic heading position. */
  function navigate(pos: number): void {
    editor.chain().setTextSelection(pos + 1).focus().scrollIntoView().run();
  }
  return { format, headings, outlineOpen, editable, undo, redo, head, statistics, setOutlineOpen, toggleEditable, count, navigate };
}
