import {
  collectWordNumberingPresetRegistry, createWordNumberingGalleryTiles, isWordNumberingPresetActive,
  resolveWordNumberingRegistry, resolveWordNumberingLevel, resolveWordParagraphNumbering,
  readWordNumberingSequenceActionState, createWordNumberingMarkerActions, type WordNumberingRegistry
} from "@quirekit/classic-numbering-model";
import type { BlockListFeature } from "@quirekit/block-editor";
import { exportListHTML } from "./html/serialize";

const registries = new WeakMap<object, WordNumberingRegistry>();
const emptyRegistry = resolveWordNumberingRegistry(null);
/** @param value - Immutable document registry identity. @returns Validated registry, shared by bounded toolbar samples. */
function cachedRegistry(value: unknown): WordNumberingRegistry {
  if (value === null || typeof value !== "object") return emptyRegistry;
  const cached = registries.get(value);
  if (cached) return cached;
  const registry = resolveWordNumberingRegistry(value);
  registries.set(value, registry);
  return registry;
}

/** Shared canonical queries projected into product-neutral list facts. */
export const blockListFacts: BlockListFeature = {
  exportHTML: exportListHTML,
  kind(node, doc) {
    const reference = resolveWordParagraphNumbering(node.attrs.wordNumbering);
    if (!reference) return null;
    if (reference.task) return "task";
    const level = resolveWordNumberingLevel(cachedRegistry(doc.attrs.wordNumberingRegistry), reference.numId, reference.level);
    return level ? level.level.format === "bullet" ? "bullet" : "ordered" : null;
  },
  presets(editor) {
    return createWordNumberingGalleryTiles(collectWordNumberingPresetRegistry(editor.extensions).presets)
      .map(tile => ({ value: tile.presetId, label: tile.lines.map(line => line.marker).join(" "), kind: tile.kind, scope: tile.scope, lines: tile.lines }));
  },
  isPresetActive: isWordNumberingPresetActive,
  canContinue(state) {
    const { $from } = state.selection;
    return $from.depth > 0 && readWordNumberingSequenceActionState(state, $from.before())?.canContinue === true;
  },
  markerActions(editor, position) {
    const node = editor.state.doc.nodeAt(position);
    const kind = node && blockListFacts.kind(node, editor.state.doc);
    if (!kind || !editor.isEditable) return [];
    const labels = { restartNumbering: "重新编号", continueNumbering: "继续编号", undoAutomaticNumbering: "撤销自动编号", removeBullets: "取消项目符号" };
    return createWordNumberingMarkerActions(position, kind).map(action => ({
      id: action.id, label: labels[action.label], disabled: !action.canExecute(editor),
      execute: () => editor.isEditable && action.canExecute(editor) && action.execute(editor)
    }));
  }
};
