import { defineCommand, type CommandProps, type MsfeEditor } from "@quirekit/msfe-core";
import {
  createFlowchartEmbed, editFlowchartDiagram, flowchartDiagramSchema, prepareFlowchartSave,
  type FlowchartDiagramPatch, type FlowchartDocument, type FlowchartEmbed, type FlowchartRasterSnapshot
} from "@quirekit/flowchart";
import { v4 as uuidv4 } from "uuid";
import { flowchartMarkdown } from "../source";

/** Host port key of the flowchart renderer handed to the AI core. */
export const msfeFlowchartRenderPort = "flowchart.render";

/** Renders a flowchart graph to the preview stored in its fence. */
export type MsfeFlowchartRenderer = (document: FlowchartDocument) => Promise<FlowchartRasterSnapshot>;

/** Input of the AI flowchart commands, prepared by their adapters. */
export interface MsfeFlowchartAgentInput {
  /** Next flowchart revision, with its preview. */
  readonly flow: FlowchartEmbed;
  /** Source range to replace; equal ends insert. */
  readonly from: number;
  /** End of the replaced range. */
  readonly to: number;
  /** Whether the fence is a new block that needs separators. */
  readonly insert: "before" | "after" | false;
}

/**
 * @param ports - Host resources.
 * @returns The host renderer.
 */
function rendererOf(ports: Readonly<Record<string, unknown>>): MsfeFlowchartRenderer {
  const render = ports[msfeFlowchartRenderPort];
  if (typeof render !== "function") throw new Error("this editor cannot draw flowcharts: the host provides no flowchart renderer");
  return render as MsfeFlowchartRenderer;
}

/**
 * @param current - Flowchart to change.
 * @param patch - Agent changes.
 * @param render - Host renderer.
 * @returns Next revision with its preview.
 */
async function nextFlowchart(current: FlowchartEmbed, patch: FlowchartDiagramPatch, render: MsfeFlowchartRenderer): Promise<FlowchartEmbed> {
  return prepareFlowchartSave(current, await render(editFlowchartDiagram(current.document, patch)), patch.title ?? current.title);
}

/**
 * @param editor - Mounted editor.
 * @param id - Flowchart identity.
 * @returns The only flowchart with that identity.
 */
function findFlowchart(editor: MsfeEditor, id: string): FlowchartEmbed {
  const matches = editor.querySource("flowchart", { from: 0, to: editor.state.doc.length }).matches
    .map(match => match.attrs.flow as FlowchartEmbed).filter(flow => flow?.id === id);
  if (matches.length !== 1) throw new Error("the flowchart does not exist or its id is not unique; read the document again");
  return matches[0]!;
}

/** @param input - Prepared change. @returns Command writing the fence. */
const writeFlowchart = (input: MsfeFlowchartAgentInput) => ({ tr }: CommandProps) => {
  const fence = flowchartMarkdown(input.flow);
  return tr.replace(input.from, input.to, input.insert === "after" ? `\n\n${fence}` : input.insert === "before" ? `${fence}\n\n` : fence);
};

/**
 * Flowchart commands the AI core may run, with the parameters and wording of the rich-text editor's.
 * @param editor - Mounted editor, read when a change is prepared.
 * @returns Command factories for `addCommands`.
 */
export function createMsfeFlowchartAgentCommands(editor: () => MsfeEditor) {
  return {
    insertFlowchart: defineCommand({
      description: "Inserts an editable flowchart after the target block (before it with before:true); the document shows its rendered picture. Supply nodes with stable id, text and shape (process by default, decision, terminator, database, actor, uml-class with attributes/operations, er-entity with fields, container as parent, and others), and edges with id/from/to node IDs and optional label. Nodes without x/y are laid out in layers; layout:\"right\" arranges left to right. Use it for process flows, architecture, class and entity diagrams.",
      target: "block", category: "figures",
      params: { ...flowchartDiagramSchema, required: ["nodes"], properties: { ...flowchartDiagramSchema.properties, before: { type: "boolean" } } },
      prepare: async (value, ports) => {
        const { before: _before, ...patch } = value as FlowchartDiagramPatch & { before?: boolean };
        return nextFlowchart(createFlowchartEmbed(uuidv4(), patch.title), patch, rendererOf(ports));
      },
      adapt: (value, { block, after, prepared }) => {
        if (block === null || prepared === undefined) return null;
        const before = (value as { before?: boolean }).before === true;
        const at = before ? block.from : after ?? block.to;
        return { flow: prepared as FlowchartEmbed, from: at, to: at, insert: before ? "before" : "after" } satisfies MsfeFlowchartAgentInput;
      },
      run: (input: MsfeFlowchartAgentInput) => writeFlowchart(input)
    }),
    updateFlowchart: defineCommand({
      description: "Edits the target flowchart incrementally: pass its id and revision from document_read, then nodes and edges to create or change by id, remove:[IDs] to delete (removing a node removes its edges), title, or layout to rearrange. Unspecified nodes and edges stay unchanged; changed nodes keep their position unless x/y are given. A new node with a lane parent and no x/y goes after that lane's content; lanes and containers grow to fit what is placed in them, so never set their width or height. Read again after a revision conflict.",
      target: "block", kinds: ["code"], category: "figures",
      params: { ...flowchartDiagramSchema, required: ["id", "revision"], properties: { ...flowchartDiagramSchema.properties,
        id: { type: "string", minLength: 1, maxLength: 160 }, revision: { type: "integer", minimum: 0 } } },
      prepare: async (value, ports) => {
        const { id, revision, ...patch } = value as FlowchartDiagramPatch & { id: string; revision: number };
        const current = findFlowchart(editor(), id);
        if (current.document.revision !== revision) throw new Error("the flowchart changed since it was read (revision conflict); read it again");
        return { flow: await nextFlowchart(current, patch, rendererOf(ports)), expected: flowchartMarkdown(current) };
      },
      adapt: (_value, { block, selected, prepared }) => {
        const change = prepared as { flow: FlowchartEmbed; expected: string } | undefined;
        if (block === null || change === undefined) return null;
        if (selected !== change.expected) throw new Error("the target block is not that flowchart, or it changed; read the document again");
        return { flow: change.flow, from: block.from, to: block.to, insert: false } satisfies MsfeFlowchartAgentInput;
      },
      run: (input: MsfeFlowchartAgentInput) => writeFlowchart(input)
    })
  };
}
