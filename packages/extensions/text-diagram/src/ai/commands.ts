import { defineCommand, type AnyCommands, type QuireEditor } from "@quirekit/core";
import { createTextDiagram, prepareTextDiagramSave, serializeTextDiagram, type TextDiagramEmbed, type TextDiagramLanguage } from "@quirekit/text-diagram";
import { v4 as uuidv4 } from "uuid";
import { readTextDiagramNode } from "../source";
import type { TextDiagramOptions, TextDiagramRenderer, TextDiagramUpdate } from "../types";

/** Agent values changing a diagram; omitted fields keep their current value. */
export interface TextDiagramAgentChange {
  /** Diagram grammar. */ readonly language?: TextDiagramLanguage;
  /** Complete replacement source. */ readonly source?: string;
  /** Plain title. */ readonly title?: string;
}

const language = { type: "string", enum: ["mermaid", "plantuml", "dot"], description: "mermaid, plantuml, or dot for Graphviz." };
const source = { type: "string", minLength: 1, maxLength: 30000, description: "Complete diagram source in the chosen language." };
const title = { type: "string", maxLength: 200 };

/**
 * Renders the changed source and builds the next revision.
 * @param current - Validated current diagram.
 * @param change - Agent values.
 * @param render - Host renderer.
 * @param editor - Owning editor.
 * @returns Next diagram with its PNG.
 */
export async function prepareTextDiagramAgentChange(current: TextDiagramEmbed, change: TextDiagramAgentChange,
  render: TextDiagramRenderer, editor: QuireEditor): Promise<TextDiagramEmbed> {
  const raster = await render(change.language ?? current.document.language, change.source ?? current.document.source, editor);
  return prepareTextDiagramSave(current, raster, change.title ?? current.title);
}

/**
 * Describes text diagram insertion and editing to the Agent.
 * @param commands - Typed insertion and compare-and-swap update.
 * @param getEditor - Owning editor.
 * @param options - Host renderer.
 * @returns Commands with Agent descriptions.
 */
export function describeTextDiagramCommands(commands: AnyCommands, getEditor: () => QuireEditor | undefined, options: TextDiagramOptions): AnyCommands {
  /** @returns Host renderer for the live editor. */
  const renderer = (): { render: TextDiagramRenderer; editor: QuireEditor } => {
    const editor = getEditor();
    if (!editor || editor.isDestroyed || !editor.isEditable) throw new Error("当前文档不能编辑文本绘图");
    if (!options.render) throw new Error("宿主未安装文本绘图渲染能力，请配置 TextDiagram.render");
    return { render: options.render, editor };
  };
  return { ...commands,
    insertTextDiagram: defineCommand({
      description: "Inserts a text diagram after the target block (before it with before:true), drawn from Mermaid, PlantUML or Graphviz DOT source; the document shows its rendered picture. Supply language and complete source, and optionally a title. Use it for flowcharts, sequence, class, state, ER, Gantt and similar diagrams written as code.",
      target: "block", category: "文本绘图",
      params: { type: "object", properties: { language, source, title, before: { type: "boolean" } }, required: ["language", "source"], additionalProperties: false },
      prepare: async value => {
        const change = value as Required<Pick<TextDiagramAgentChange, "language" | "source">> & TextDiagramAgentChange;
        const { render, editor } = renderer();
        return prepareTextDiagramAgentChange(createTextDiagram("prepared", change.language, change.source), change, render, editor);
      },
      adapt: (value, { doc, pos, prepared }) => {
        if (pos === null || !prepared) return null;
        const node = doc.nodeAt(pos); if (!node) return null;
        const at = (value as { before?: boolean }).before ? pos : pos + node.nodeSize;
        return { document: { ...prepared as TextDiagramEmbed, id: uuidv4() }, from: at, to: at };
      },
      run: commands.insertTextDiagram!
    }),
    updateTextDiagram: defineCommand({
      description: "Edits the target text diagram: pass its id and revision from document_read, then the complete new source, and language or title to change them. The source is replaced as a whole, so read long sources first with document_read items. Read again after a revision conflict.",
      target: "block", nodes: ["textDiagram"], category: "文本绘图",
      params: { type: "object", properties: { id: { type: "string", minLength: 1, maxLength: 128 }, revision: { type: "integer", minimum: 0 }, language, source, title },
        required: ["id", "revision"], additionalProperties: false },
      prepare: async value => {
        const { id, revision, ...change } = value as TextDiagramAgentChange & { id: string; revision: number };
        const { render, editor } = renderer();
        const current = findDiagram(editor, id);
        if (current.document.revision !== revision) throw new Error("文本绘图版本已变化，请重新读取后修改");
        return { document: await prepareTextDiagramAgentChange(current, change, render, editor), expected: serializeTextDiagram(current) };
      },
      adapt: (_value, { pos, prepared }) => pos === null || !prepared ? null
        : { position: pos, ...prepared as Omit<TextDiagramUpdate, "position"> },
      run: commands.updateTextDiagram!
    })
  };
}

/** @param editor - Owning editor. @param id - Diagram identity. @returns Unique diagram block with that identity. */
function findDiagram(editor: QuireEditor, id: string): TextDiagramEmbed {
  const matches: TextDiagramEmbed[] = [];
  editor.state.pm.doc.descendants(node => {
    if (node.type.name !== "textDiagram") return;
    const diagram = readTextDiagramNode(node);
    if (diagram?.id === id) matches.push(diagram);
  });
  if (matches.length !== 1) throw new Error("文本绘图不存在或 ID 重复，请重新读取文档并选择唯一图形");
  return matches[0]!;
}
