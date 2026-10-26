import { createFlowchartImageNode, readFlowchart, serializeFlowchart, updateFlowchartImage } from "@quirekit/flowchart";
import type { FlowchartEditor } from "../../types";
import { readGraph } from "../../codec/read";
import { appendNode } from "../content";
import { applyStructure } from "../structure/apply";
import { requireIdle } from "../commands";
import { requireAuthoring } from "../structure/permissions";
import type { FlowRuntime, FlowTextInput } from "../types";
import { v4 as uuidv4 } from "uuid";

/** @param runtime - Isolated graph. @param text - Native text ownership. @returns Explicit resource mutations with one validation/history boundary. */
export function createMediaCommands(runtime: FlowRuntime, text: FlowTextInput): Pick<FlowchartEditor, "addImage" | "setImage"> {
  /** Guards permission before any pending text is committed. */
  function writable(): void { requireAuthoring(runtime); requireIdle(runtime, text); }
  return {
    /** @param image - Embedded content. @param point - Optional world position. @returns New selected identity. */
    addImage(image, point) {
      writable(); const before = readGraph(runtime.graph, runtime.options.document.revision);
      const node = createFlowchartImageNode(`image-${uuidv4()}`, image, point ?? { x: 0, y: 0 });
      if (!point) {
        const rect = runtime.mount.getBoundingClientRect(), center = runtime.graph.clientToLocal(rect.x + rect.width / 2, rect.y + rect.height / 2);
        Object.assign(node, { x: center.x - node.width / 2, y: center.y - node.height / 2 });
      }
      // Resource decoding occurs once at this explicit command, never during pointer events.
      serializeFlowchart(readFlowchart({ ...before, nodes: [...before.nodes, node] }));
      appendNode(runtime, node); runtime.graph.resetSelection(node.id); return node.id;
    },
    /** @param id - Existing node. @param image - Replacement. @param expected - Opening source. */
    setImage(id, image, expected) {
      writable(); const before = readGraph(runtime.graph, runtime.options.document.revision), after = updateFlowchartImage(before, id, image, expected);
      serializeFlowchart(after); applyStructure(runtime, before, after, runtime.graph.getSelectedCells().map(c => c.id));
    },
  };
}
