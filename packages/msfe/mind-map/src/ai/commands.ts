import { defineCommand, type CommandProps, type MsfeEditor } from "@quirekit/msfe-core";
import {
  createMindMapEmbed, editMindMapDiagram, mindMapDiagramSchema, normalizeMindMapInsertion, prepareMindMapSave, readMindMapEmbed,
  type MindMapDiagramPatch, type MindMapDocument, type MindMapEmbed, type MindMapRasterSnapshot
} from "@quirekit/mind-map";
import { v4 as uuidv4 } from "uuid";
import { mindMapMarkdown } from "../source";

/** Host port key of the mind map renderer handed to the AI core. */
export const msfeMindMapRenderPort = "mindMap.render";

/** Renders a mind map to the preview stored in its fence. */
export type MsfeMindMapRenderer = (document: MindMapDocument) => Promise<MindMapRasterSnapshot>;

/** Input of the AI mind map commands, prepared by their adapters. */
export interface MsfeMindMapAgentInput {
  /** Next mind map revision, with its preview. */
  readonly mind: MindMapEmbed;
  /** Source range to replace; equal ends insert. */
  readonly from: number;
  /** End of the replaced range. */
  readonly to: number;
  /** Whether the fence is a new block that needs separators. */
  readonly insert: "before" | "after" | false;
}

/** @param ports - Host resources. @returns The host renderer. */
function rendererOf(ports: Readonly<Record<string, unknown>>): MsfeMindMapRenderer {
  const render = ports[msfeMindMapRenderPort];
  if (typeof render !== "function") throw new Error("this editor cannot draw mind maps: the host provides no mind map renderer");
  return render as MsfeMindMapRenderer;
}

/**
 * @param current - Mind map to change.
 * @param patch - Agent changes.
 * @param render - Host renderer.
 * @returns Next revision with its preview.
 */
async function nextMindMap(current: MindMapEmbed, patch: MindMapDiagramPatch, render: MsfeMindMapRenderer): Promise<MindMapEmbed> {
  return prepareMindMapSave(current, await render(editMindMapDiagram(current.document, patch)), patch.title ?? current.title);
}

/** @param error - Failure of a mind map change. @returns The failure with how to write topics. */
function explain(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`${message.replace(/[.。]$/u, "")} — root is the central topic's text, the central topic's id is root, and every other topic names its parent id ("root" for the main branches)`);
}

/** @param editor - Mounted editor. @param id - Mind map identity. @returns The only mind map with that identity. */
function findMindMap(editor: MsfeEditor, id: string): MindMapEmbed {
  const matches = editor.querySource("mindMap", { from: 0, to: editor.state.doc.length }).matches
    .map(match => match.attrs.mind as MindMapEmbed).filter(mind => mind?.id === id);
  if (matches.length !== 1) throw new Error("the mind map does not exist or its id is not unique; read the document again");
  return matches[0]!;
}

/** @param input - Prepared change. @returns Command writing the fence. */
const writeMindMap = (input: MsfeMindMapAgentInput) => ({ tr }: CommandProps) => {
  const fence = mindMapMarkdown(input.mind);
  return tr.replace(input.from, input.to, input.insert === "after" ? `\n\n${fence}` : input.insert === "before" ? `${fence}\n\n` : fence);
};

/**
 * Mind map commands the AI core may run, with the parameters and wording of the rich-text editor's.
 * @param editor - Mounted editor, read when a change is prepared.
 * @returns Command factories for `addCommands`.
 */
export function createMsfeMindMapAgentCommands(editor: () => MsfeEditor) {
  return {
    insertMindMap: defineCommand({
      description: "Inserts an editable mind map after the target block (before it with before:true); the document shows its rendered picture. Supply root (the central topic text) and topics with stable id, text and parent: the central topic's id is root, and a topic may parent topics listed after it. Topics accept note, link and marker (priority-1..3); layout chooses mind-map, logical-right, logical-left, organization or timeline.",
      target: "block", category: "figures",
      params: { ...mindMapDiagramSchema, required: ["root"], properties: { ...mindMapDiagramSchema.properties,
        root: { type: "string", minLength: 1, maxLength: 2000 }, before: { type: "boolean" } } },
      prepare: async (value, ports) => {
        const { before: _before, root: written, ...given } = value as MindMapDiagramPatch & { root: string; before?: boolean };
        const { root, patch } = normalizeMindMapInsertion(written, given);
        const created = createMindMapEmbed(uuidv4(), patch.title ?? root);
        const blank = readMindMapEmbed({ ...created, document: { ...created.document, root: { ...created.document.root, id: "root", text: root } } });
        try { return await nextMindMap(blank, patch, rendererOf(ports)); } catch (error) { throw error instanceof Error && error.message.includes("renderer") ? error : explain(error); }
      },
      adapt: (value, { block, after, prepared }) => {
        if (block === null || prepared === undefined) return null;
        const before = (value as { before?: boolean }).before === true;
        const at = before ? block.from : after ?? block.to;
        return { mind: prepared as MindMapEmbed, from: at, to: at, insert: before ? "before" : "after" } satisfies MsfeMindMapAgentInput;
      },
      run: (input: MsfeMindMapAgentInput) => writeMindMap(input)
    }),
    updateMindMap: defineCommand({
      description: "Edits the target mind map incrementally: pass its id and revision from document_read, then topics to create or change by id (text, parent to attach or move, index among siblings from 0, note, link, marker, collapsed), remove:[IDs] to delete branches, title or layout. Unspecified topics stay unchanged. Read again after a revision conflict.",
      target: "block", kinds: ["code"], category: "figures",
      params: { ...mindMapDiagramSchema, required: ["id", "revision"], properties: { ...mindMapDiagramSchema.properties,
        id: { type: "string", minLength: 1, maxLength: 160 }, revision: { type: "integer", minimum: 0 } } },
      prepare: async (value, ports) => {
        const { id, revision, ...patch } = value as MindMapDiagramPatch & { id: string; revision: number };
        const current = findMindMap(editor(), id);
        if (current.document.revision !== revision) throw new Error("the mind map changed since it was read (revision conflict); read it again");
        return { mind: await nextMindMap(current, patch, rendererOf(ports)), expected: mindMapMarkdown(current) };
      },
      adapt: (_value, { block, selected, prepared }) => {
        const change = prepared as { mind: MindMapEmbed; expected: string } | undefined;
        if (block === null || change === undefined) return null;
        if (selected !== change.expected) throw new Error("the target block is not that mind map, or it changed; read the document again");
        return { mind: change.mind, from: block.from, to: block.to, insert: false } satisfies MsfeMindMapAgentInput;
      },
      run: (input: MsfeMindMapAgentInput) => writeMindMap(input)
    })
  };
}
