import { defineCommand, type AnyCommands, type QuireEditor } from "@quirekit/core";
import { createMindMapEmbed, editMindMapDiagram, mindMapDiagramSchema, normalizeMindMapInsertion, prepareMindMapSave, readMindMapEmbed, serializeMindMapEmbed,
  type MindMapDiagramPatch, type MindMapEmbed } from "@quirekit/mind-map";
import { v4 as uuidv4 } from "uuid";
import { readMindMapNode } from "../source";
import type { MindMapOptions, MindMapRenderer, MindMapUpdate } from "../types";

/**
 * Applies an Agent edit, renders the next mind map and builds the next revision.
 * @param current - Validated current mind map.
 * @param patch - Agent edit.
 * @param render - Host renderer.
 * @param editor - Owning editor.
 * @returns Next mind map with its PNG.
 */
export async function prepareMindMapAgentChange(current: MindMapEmbed, patch: MindMapDiagramPatch,
  render: MindMapRenderer, editor: QuireEditor): Promise<MindMapEmbed> {
  const raster = await render(editMindMapDiagram(current.document, patch), editor);
  return prepareMindMapSave(current, raster, patch.title ?? current.title);
}

/**
 * Describes mind map insertion and editing to the Agent.
 * @param commands - Typed insertion and compare-and-swap update.
 * @param getEditor - Owning editor.
 * @param options - Host renderer.
 * @returns Commands with Agent descriptions.
 */
export function describeMindMapCommands(commands: AnyCommands, getEditor: () => QuireEditor | undefined, options: MindMapOptions): AnyCommands {
  /** @returns Host renderer for the live editor. */
  const renderer = (): { render: MindMapRenderer; editor: QuireEditor } => {
    const editor = getEditor();
    if (!editor || editor.isDestroyed || !editor.isEditable) throw new Error("当前文档不能编辑思维导图");
    if (!options.render) throw new Error("宿主未安装思维导图渲染能力，请配置 MindMap.render");
    return { render: options.render, editor };
  };
  return { ...commands,
    insertMindMap: defineCommand({
      description: "Inserts an editable mind map after the target block (before it with before:true); the document shows its rendered picture. Supply root (the central topic text) and topics with stable id, text and parent: the central topic's id is root, and a topic may parent topics listed after it. Topics accept note, link and marker (priority-1..3); layout chooses mind-map, logical-right, logical-left, organization or timeline.",
      target: "block", category: "思维导图",
      params: { ...mindMapDiagramSchema, required: ["root"], properties: { ...mindMapDiagramSchema.properties,
        root: { type: "string", minLength: 1, maxLength: 2000 }, before: { type: "boolean" } } },
      prepare: async value => {
        const { before: _before, root: written, ...given } = value as MindMapDiagramPatch & { root: string; before?: boolean };
        const { root, patch } = normalizeMindMapInsertion(written, given);
        const { render, editor } = renderer();
        const created = createMindMapEmbed("prepared", patch.title ?? root);
        const blank = readMindMapEmbed({ ...created, document: { ...created.document, root: { ...created.document.root, id: "root", text: root } } });
        return prepareMindMapAgentChange(blank, patch, render, editor);
      },
      adapt: (value, { doc, pos, prepared }) => {
        if (pos === null || !prepared) return null;
        const node = doc.nodeAt(pos); if (!node) return null;
        const at = (value as { before?: boolean }).before ? pos : pos + node.nodeSize;
        return { document: { ...prepared as MindMapEmbed, id: uuidv4() }, from: at, to: at };
      },
      run: commands.insertMindMap!
    }),
    updateMindMap: defineCommand({
      description: "Edits the target mind map incrementally: pass its id and revision from document_read, then topics to create or change by id (text, parent to attach or move, index among siblings from 0, note, link, marker, collapsed), remove:[IDs] to delete branches, title or layout. Unspecified topics stay unchanged. Read again after a revision conflict.",
      target: "block", nodes: ["mindMap"], category: "思维导图",
      params: { ...mindMapDiagramSchema, required: ["id", "revision"], properties: { ...mindMapDiagramSchema.properties,
        id: { type: "string", minLength: 1, maxLength: 160 }, revision: { type: "integer", minimum: 0 } } },
      prepare: async value => {
        const { id, revision, ...patch } = value as MindMapDiagramPatch & { id: string; revision: number };
        const { render, editor } = renderer();
        const current = findMindMap(editor, id);
        if (current.document.revision !== revision) throw new Error("思维导图版本已变化，请重新读取后修改");
        return { document: await prepareMindMapAgentChange(current, patch, render, editor), expected: serializeMindMapEmbed(current) };
      },
      adapt: (_value, { pos, prepared }) => pos === null || !prepared ? null
        : { position: pos, ...prepared as Omit<MindMapUpdate, "position"> },
      run: commands.updateMindMap!
    })
  };
}

/** @param editor - Owning editor. @param id - Mind map identity. @returns Unique mind map block with that identity. */
function findMindMap(editor: QuireEditor, id: string): MindMapEmbed {
  const matches: MindMapEmbed[] = [];
  editor.state.pm.doc.descendants(node => {
    if (node.type.name !== "mindMap") return;
    const mind = readMindMapNode(node);
    if (mind?.id === id) matches.push(mind);
  });
  if (matches.length !== 1) throw new Error("思维导图不存在或 ID 重复，请重新读取文档并选择唯一图形");
  return matches[0]!;
}
