import { defineCommand, type AnyCommands, type QuireEditor } from "@quirekit/core";
import { createFlowchartEmbed, editFlowchartDiagram, flowchartDiagramSchema, prepareFlowchartSave, serializeFlowchartEmbed,
  type FlowchartDiagramPatch, type FlowchartEmbed } from "@quirekit/flowchart";
import { v4 as uuidv4 } from "uuid";
import { readFlowchartNode } from "../source";
import type { FlowchartOptions, FlowchartRenderer, FlowchartUpdate } from "../types";

/**
 * Applies an Agent edit, renders the next graph and builds the next revision.
 * @param current - Validated current flowchart.
 * @param patch - Agent edit.
 * @param render - Host renderer.
 * @param editor - Owning editor.
 * @returns Next flowchart with its PNG.
 */
export async function prepareFlowchartAgentChange(current: FlowchartEmbed, patch: FlowchartDiagramPatch,
  render: FlowchartRenderer, editor: QuireEditor): Promise<FlowchartEmbed> {
  const raster = await render(editFlowchartDiagram(current.document, patch), editor);
  return prepareFlowchartSave(current, raster, patch.title ?? current.title);
}

/**
 * Describes flowchart insertion and editing to the Agent.
 * @param commands - Typed insertion and compare-and-swap update.
 * @param getEditor - Owning editor.
 * @param options - Host renderer.
 * @returns Commands with Agent descriptions.
 */
export function describeFlowchartCommands(commands: AnyCommands, getEditor: () => QuireEditor | undefined, options: FlowchartOptions): AnyCommands {
  /** @returns Host renderer for the live editor. */
  const renderer = (): { render: FlowchartRenderer; editor: QuireEditor } => {
    const editor = getEditor();
    if (!editor || editor.isDestroyed || !editor.isEditable) throw new Error("当前文档不能编辑流程图");
    if (!options.render) throw new Error("宿主未安装流程图渲染能力，请配置 Flowchart.render");
    return { render: options.render, editor };
  };
  return { ...commands,
    insertFlowchart: defineCommand({
      description: "Inserts an editable flowchart after the target block (before it with before:true); the document shows its rendered picture. Supply nodes with stable id, text and shape (process by default, decision, terminator, database, actor, uml-class with attributes/operations, er-entity with fields, container as parent, and others), and edges with id/from/to node IDs and optional label. Nodes without x/y are laid out in layers; layout:\"right\" arranges left to right. Use it for process flows, architecture, class and entity diagrams.",
      target: "block", category: "流程图",
      params: { ...flowchartDiagramSchema, required: ["nodes"], properties: { ...flowchartDiagramSchema.properties, before: { type: "boolean" } } },
      prepare: async value => {
        const { before: _before, ...patch } = value as FlowchartDiagramPatch & { before?: boolean };
        const { render, editor } = renderer();
        return prepareFlowchartAgentChange(createFlowchartEmbed("prepared", patch.title), patch, render, editor);
      },
      adapt: (value, { doc, pos, prepared }) => {
        if (pos === null || !prepared) return null;
        const node = doc.nodeAt(pos); if (!node) return null;
        const at = (value as { before?: boolean }).before ? pos : pos + node.nodeSize;
        return { document: { ...prepared as FlowchartEmbed, id: uuidv4() }, from: at, to: at };
      },
      run: commands.insertFlowchart!
    }),
    updateFlowchart: defineCommand({
      description: "Edits the target flowchart incrementally: pass its id and revision from document_read, then nodes and edges to create or change by id, remove:[IDs] to delete (removing a node removes its edges), title, or layout to rearrange. Unspecified nodes and edges stay unchanged; changed nodes keep their position unless x/y are given. A new node with a lane parent and no x/y goes after that lane's content; lanes and containers grow to fit what is placed in them, so never set their width or height. Read again after a revision conflict.",
      target: "block", nodes: ["flowchart"], category: "流程图",
      params: { ...flowchartDiagramSchema, required: ["id", "revision"], properties: { ...flowchartDiagramSchema.properties,
        id: { type: "string", minLength: 1, maxLength: 160 }, revision: { type: "integer", minimum: 0 } } },
      prepare: async value => {
        const { id, revision, ...patch } = value as FlowchartDiagramPatch & { id: string; revision: number };
        const { render, editor } = renderer();
        const current = findFlowchart(editor, id);
        if (current.document.revision !== revision) throw new Error("流程图版本已变化，请重新读取后修改");
        return { document: await prepareFlowchartAgentChange(current, patch, render, editor), expected: serializeFlowchartEmbed(current) };
      },
      adapt: (_value, { pos, prepared }) => pos === null || !prepared ? null
        : { position: pos, ...prepared as Omit<FlowchartUpdate, "position"> },
      run: commands.updateFlowchart!
    })
  };
}

/** @param editor - Owning editor. @param id - Flowchart identity. @returns Unique flowchart block with that identity. */
function findFlowchart(editor: QuireEditor, id: string): FlowchartEmbed {
  const matches: FlowchartEmbed[] = [];
  editor.state.pm.doc.descendants(node => {
    if (node.type.name !== "flowchart") return;
    const flow = readFlowchartNode(node);
    if (flow?.id === id) matches.push(flow);
  });
  if (matches.length !== 1) throw new Error("流程图不存在或 ID 重复，请重新读取文档并选择唯一图形");
  return matches[0]!;
}
