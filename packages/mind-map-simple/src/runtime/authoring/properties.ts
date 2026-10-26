import type { MindMapEditor } from "../../types";
import { readMindMapDocument } from "@quirekit/mind-map";
import type { MindMapCommandContext } from "./types";
import type { createMindMapQueue } from "../queue";
import { mindMapSelectionFormatting } from "./formatting";
import { fromSimpleDetails, simpleDetailsKeys } from "../../codec/details";

/** @param context - Owned mutation and lifetime authorities. @param queue - Serialized public intents.
 * @returns Property consumers that never subscribe to viewport frames. */
export function createMindMapProperties(context: MindMapCommandContext, queue: ReturnType<typeof createMindMapQueue>):
  Pick<MindMapEditor, "replaceDocument" | "getSelectedTopicIds" | "getAnnotations" | "putAnnotation" | "removeAnnotation" | "getFormatting" | "format" | "getDetails" | "setDetails" | "applyContent" | "focusBranch"> {
  const { instance, assertActive, assertWritable, structure, cancel } = context;
  /** @returns Current visible selection identities. */
  function getSelectedTopicIds(): readonly string[] {
    assertActive(); return Object.freeze(instance.renderer.activeNodeList.map(node => String(node.getData("uid"))));
  }
  return {
    getSelectedTopicIds,
    /** @param id - Captured target. @returns One serialized branch focus. */
    focusBranch(id) { return queue.run(async () => { assertWritable(); cancel(); await structure.focus(id); }); },
    /** @param update - Captured batch. @returns One serialized content mutation. */
    applyContent(update) {
      const value = structuredClone(update);
      return queue.run(async () => { assertWritable(); cancel(); await structure.content(value); });
    },
    /** @param document - External source captured independently of its caller. @returns One serialized replacement. */
    replaceDocument(document) {
      const value = readMindMapDocument(document);
      return queue.run(async () => { assertWritable(); cancel(); await structure.replace(value); });
    },
    /** @returns Single-topic content; null identifies no selection or an ambiguous selection. */
    getDetails() {
      assertActive(); const nodes = instance.renderer.activeNodeList;
      if (nodes.length !== 1) return null;
      return fromSimpleDetails(Object.fromEntries(simpleDetailsKeys.map(key => [key, nodes[0]!.getData(key)]))) ?? {};
    },
    /** @param patch - Explicit field edits. @param targets - Optional stable target IDs. @returns Serialized content mutation. */
    setDetails(patch, targets = getSelectedTopicIds()) {
      const ids = [...targets], update = structuredClone(patch);
      return queue.run(async () => { assertWritable(); cancel(); await structure.details(ids, update); });
    },
    /** @returns Detached selected-node fields; reading never snapshots the document. */
    getFormatting() { assertActive(); return mindMapSelectionFormatting(instance); },
    /** @param patch - Field updates or clear-all intent. @returns One serialized formatting command. */
    format(patch) {
      const ids = getSelectedTopicIds(), update = patch === null ? null : { ...patch };
      return queue.run(async () => { assertWritable(); cancel(); await structure.format(ids, update); });
    },
    /** @returns Detached annotations from the retained carrier, without getData or history reads. */
    getAnnotations() { assertActive(); return structuredClone(instance.renderer.renderTree.data._quirekitAnnotations ?? []); },
    /** @param annotation - Complete semantic object. @returns One queued source mutation. */
    putAnnotation(annotation) {
      const value = structuredClone(annotation);
      return queue.run(async () => { assertWritable(); cancel(); await structure.annotate(value); });
    },
    /** @param id - Semantic object identity. @returns One queued removal. */
    removeAnnotation(id) { return queue.run(async () => { assertWritable(); cancel(); await structure.annotate(id); }); },
  };
}
