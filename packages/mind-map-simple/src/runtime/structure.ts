import { mindMapRuntimeMessages } from "./locale";
import { setMindMapLayout, focusMindMapBranch, applyMindMapContent, addMindMapFloatingTopic, moveMindMapTopic, removeMindMapTopics, pasteMindMapTopics, readMindMapDocument, serializeMindMap, editMindMapStructure, revealMindMapTopic, formatMindMapTopics, putMindMapAnnotation, removeMindMapAnnotation, setMindMapTopicDetails,
  type MindMapClipboard, type MindMapDocument, type MindMapPoint, type MindMapLayout, type MindMapStructureCommand, type MindMapStylePatch, type MindMapAnnotation, type MindMapDetailsPatch, type MindMapContentUpdate } from "@quirekit/mind-map";
import { fromSimpleTree, toSimpleTree } from "../codec/mapping";
import type { SimpleInstance } from "../vendor/types";
import { settleMindMapLayout } from "./layout";
import type { MindMapDrop } from "./gestures/types";
import { setMindMapSelection } from "../vendor/selection";
import { prepareMindMapImages } from "./images";
import { v4 as uuidv4 } from "uuid";

/**
 * Commits complete forest changes through the existing single history carrier.
 * @param instance - Owned renderer.
 * @param base - Host revision and schema metadata.
 * @param assertActive - Lifecycle and composition guard.
 * @param assertWritable - Permission guard immediately before publishing asynchronous work.
 * @param locale - Instance UI language read only for newly created text.
 * @returns Atomic authoring operations.
 */
export function createMindMapStructure(instance: SimpleInstance, base: MindMapDocument, assertActive: () => void, assertWritable = assertActive, locale = () => "zh-CN") {
  /** @returns Source after committing the previous native text session. */
  function current(): MindMapDocument {
    assertActive(); instance.renderer.textEdit.hideEditTextBox(); instance.command.originAddHistory();
    return fromSimpleTree(instance.getData(), base);
  }
  /** @param document - Validated new forest. @param ids - Selection to restore after layout. @returns Render completion. */
  async function commit(document: MindMapDocument, ids: readonly string[] = []): Promise<void> {
    await prepareMindMapImages(document); assertWritable();
    setMindMapSelection(instance, []);
    instance.updateData(toSimpleTree(document));
    await settleMindMapLayout(instance); assertActive(); instance.command.originAddHistory();
    setMindMapSelection(instance, ids.flatMap(id => { const node = instance.renderer.findNodeByUid(id); return node ? [node] : []; }));
  }
  return {
    /** @param update - Captured property mutations. @returns One validated source and history change. */
    async content(update: MindMapContentUpdate): Promise<void> {
      const ids = instance.renderer.activeNodeList.map(node => String(node.getData("uid")));
      const source = current(), next = applyMindMapContent(source, update);
      if (next !== source) await commit(next, ids);
    },
    /** @param document - Captured full content. @returns One undo step; the host retains version authority. */
    async replace(document: MindMapDocument): Promise<void> {
      const source = current(), next = readMindMapDocument({ ...document, revision: base.revision });
      if (serializeMindMap(source) !== serializeMindMap(next)) await commit(next, [next.root.id]);
    },
    /** @param ids - Captured target identities. @param patch - Explicit content fields. @returns One atomic detail mutation. */
    async details(ids: readonly string[], patch: MindMapDetailsPatch | null): Promise<void> {
      const source = current(), next = setMindMapTopicDetails(source, ids, patch);
      if (next !== source) await commit(next, ids);
    },
    /** @param value - Object to upsert, or ID to remove. @returns Single source history operation. */
    async annotate(value: MindMapAnnotation | string): Promise<void> {
      const source = current(), next = typeof value === "string" ? removeMindMapAnnotation(source, value) : putMindMapAnnotation(source, value);
      if (next !== source) await commit(next, instance.renderer.activeNodeList.map(node => String(node.getData("uid"))));
    },
    /** @param ids - Captured selection. @param patch - Explicit fields, or null to clear all. @returns One undoable formatting change. */
    async format(ids: readonly string[], patch: MindMapStylePatch | null): Promise<void> {
      const source = current(), next = formatMindMapTopics(source, ids, patch);
      if (next !== source) await commit(next, ids);
    },
    /** @param id - Captured branch identity. @returns One atomic fold of the other branches. */
    async focus(id: string): Promise<void> {
      const source = current(), next = focusMindMapBranch(source, id);
      if (next !== source) await commit(next, [id]);
    },
    /** @param id - Hidden topic. @returns Whether it still exists after its ancestors are opened. */
    async reveal(id: string): Promise<boolean> {
      const source = current(), result = revealMindMapTopic(source, id);
      if (result.document !== source) await commit(result.document, result.selectedIds);
      return result.selectedIds.length > 0;
    },
    /** @param command - Portable structure intent. @param ids - Captured selected identities. @returns One undoable change. */
    async edit(command: MindMapStructureCommand, ids: readonly string[]): Promise<void> {
      const source = current(), result = editMindMapStructure(source, ids, command, () => `topic-${uuidv4()}`, mindMapRuntimeMessages(locale()).parent);
      if (result.document !== source) await commit(result.document, result.selectedIds);
    },
    /** @param fragment - Captured portable topics. @param destination - Captured parent or position. @returns Paste completion. */
    async paste(fragment: MindMapClipboard, destination: string | MindMapPoint): Promise<void> {
      const result = pasteMindMapTopics(current(), fragment, destination, () => `topic-${uuidv4()}`);
      await commit(result.document, result.ids);
    },
    /** @param layout - Admitted arrangement. @returns One undoable layout change. */
    async setLayout(layout: MindMapLayout): Promise<void> {
      const source = current();
      if (source.layout === layout) return;
      const ids = instance.renderer.activeNodeList.map(node => String(node.getData("uid")));
      await commit(setMindMapLayout(source, layout), ids);
    },
    /** @param position - Root-relative position. @returns Completion of creating and selecting a free topic. */
    async add(position: MindMapPoint): Promise<void> {
      const source = current(), id = `free-${uuidv4()}`;
      let point = position;
      while (source.floatingTopics?.some(topic => Math.abs(topic.position.x - point.x) < 24 && Math.abs(topic.position.y - point.y) < 24)) {
        point = { x: point.x + 32, y: point.y + 48 };
      }
      await commit(addMindMapFloatingTopic(source, id, point, mindMapRuntimeMessages(locale()).floating), [id]);
    },
    /** @param ids - Selected subtrees, including possible overlapping descendants. @returns Atomic deletion completion. */
    async remove(ids: readonly string[]): Promise<void> { await commit(removeMindMapTopics(current(), ids)); },
    /** @param drop - Topmost selected subtrees and their resolved destination. @returns One history entry for the whole gesture. */
    async drop(drop: MindMapDrop): Promise<void> {
      let source = current();
      for (const move of drop.moves) source = moveMindMapTopic(source, move.id, drop.parentId ?? move.position, move.side);
      await commit(source, drop.moves.map(move => move.id));
    },
  };
}
