import { defineCommand, type AnyCommands, type QuireEditor } from "@quirekit/core";
import { createWhiteboardDocument, prepareWhiteboardDiagram, serializeWhiteboard, whiteboardDiagramSchema,
  type WhiteboardDocument, type WhiteboardDiagramPatch } from "@quirekit/whiteboard";
import { readWhiteboardNode } from "../source";
import type { WhiteboardOptions } from "../types";
import type { WhiteboardAgentUpdate, PreparedWhiteboardUpdate } from "./types";
import { v4 as uuidv4 } from "uuid";

/** @param editor - Owning source. @param id - Exact whiteboard identity. @returns Unique current source, rejecting ambiguity. */
function findBoard(editor: QuireEditor, id: string): WhiteboardDocument {
  const matches: WhiteboardDocument[] = [];
  editor.state.pm.doc.descendants(node => {
    if (node.type.name !== "whiteboard") return;
    const board = readWhiteboardNode(node); if (board?.id === id) matches.push(board);
  });
  if (matches.length !== 1) throw new Error("白板不存在或 ID 重复，请重新读取文档并选择唯一白板");
  return matches[0]!;
}

/**
 * Describes the canonical synchronous mutations; resource preparation cannot
 * write to the document and the update checks its complete captured baseline.
 * @param commands - Existing insertion and CAS update commands.
 * @param getEditor - Lifecycle-bound per-instance source authority.
 * @param options - Explicit rendering capability.
 * @returns Described commands collected by the central AI manager.
 */
export function describeWhiteboardCommands(commands: AnyCommands, getEditor: () => QuireEditor | undefined, options: WhiteboardOptions): AnyCommands {
  /** @param original - Captured baseline. @param patch - Incremental request. @returns Matching next scene and preview. */
  async function prepare(original: WhiteboardDocument, patch: WhiteboardDiagramPatch): Promise<WhiteboardDocument> {
    const editor = getEditor();
    if (!editor || editor.isDestroyed || !editor.isEditable) throw new Error("当前文档不能编辑白板");
    if (!options.renderScene) throw new Error("宿主未安装白板图形渲染能力，请配置 Whiteboard.renderScene");
    return prepareWhiteboardDiagram(original, patch, scene => options.renderScene!(scene, editor));
  }
  return { ...commands,
    insertWhiteboard: defineCommand({
      description: "Inserts an editable whiteboard after the target block (before it with before:true). Supply title, nodes with stable id and label, and edges with id/from/to node IDs. Shapes: rectangle (default), ellipse, diamond, text. Coordinates/sizes are scene pixels; omitted coordinates use a four-column layout. Supports flowcharts, labeled diagrams and drawings. Do not supply image bytes or Excalidraw internals.",
      target: "block", category: "白板", params: { ...whiteboardDiagramSchema,
        required: ["nodes"], properties: { ...whiteboardDiagramSchema.properties, before: { type: "boolean" } } },
      prepare: async value => {
        const { before: _before, ...patch } = value as WhiteboardDiagramPatch & { before?: boolean };
        return prepare(createWhiteboardDocument("prepared"), patch);
      },
      adapt: (value, { doc, pos, prepared }) => {
        if (pos === null || !prepared) return null;
        const node = doc.nodeAt(pos); if (!node) return null;
        const at = (value as { before?: boolean }).before ? pos : pos + node.nodeSize;
        // Prepared images are cacheable; document identities are allocated per insertion.
        return { document: { ...prepared as WhiteboardDocument, id: uuidv4() }, from: at, to: at };
      },
      run: commands.insertWhiteboard!,
    }),
    updateWhiteboard: defineCommand({
      description: "Edits the target whiteboard incrementally: pass its id and revision from document_read, then nodes/edges to create or update by element ID, remove:[IDs], and/or title. Unspecified nodes, freehand strokes and images remain. Nodes accept label, x/y, width/height, fill/color and fontSize. Connected arrows follow moved nodes; removing a node removes its label and incident edges. Read again after a revision conflict.",
      target: "block", nodes: ["whiteboard"], category: "白板", params: { ...whiteboardDiagramSchema,
        required: ["id", "revision"], properties: { ...whiteboardDiagramSchema.properties,
          id: { type: "string", minLength: 1, maxLength: 160 }, revision: { type: "integer", minimum: 0 } } },
      prepare: async value => {
        const editor = getEditor();
        if (!editor) throw new Error("白板文档已关闭");
        const { id, revision, ...patch } = value as WhiteboardAgentUpdate;
        const board = findBoard(editor, id);
        if (board.revision !== revision) throw new Error("白板版本已变化，请重新读取后修改");
        return { document: await prepare(board, patch), expected: serializeWhiteboard(board) } satisfies PreparedWhiteboardUpdate;
      },
      adapt: (_value, { pos, prepared }) => pos === null || !prepared ? null : { position: pos, ...prepared as PreparedWhiteboardUpdate },
      run: commands.updateWhiteboard!,
    }),
  };
}
