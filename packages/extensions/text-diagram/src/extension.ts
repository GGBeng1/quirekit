import { Node, type QuireJSONContent } from "@quirekit/core";
import { createTextDiagramDocxCodec } from "./docx/codec";
import { NodeSelection, Plugin, type EditorView, type Node as PMNode } from "@quirekit/pm";
import { readTextDiagram, serializeTextDiagram } from "@quirekit/text-diagram";
import { textDiagramCommands } from "./commands";
import { textDiagramLayout } from "./layout";
import { textDiagramNodeView } from "./view";
import { openTextDiagram } from "./session";
import { forkTextDiagramSlice } from "./clipboard";
import type { TextDiagramOptions, TextDiagramStorage } from "./types";
import { describeTextDiagramCommands } from "./ai/commands";
import { textDiagramAiCapabilities } from "./ai/facts";

/** Generic source-backed atom; hosts supply their task UI through options. */
export const TextDiagram = Node.create<TextDiagramOptions, TextDiagramStorage>({
  name: "textDiagram", group: "block", atom: true, selectable: true, draggable: true,
  /** @returns Product-owned UI hook, absent in headless consumers. */
  addOptions() { return { open: null, render: null }; },
  /** @returns Editor slot for Agent command preparation. */
  addStorage() { return { editor: undefined }; },
  /** Binds descriptors only after Core has allocated this editor. */
  onBeforeCreate() { this.storage.editor = this.editor; },
  /** Releases the editor reference. */
  onDestroy() { this.storage.editor = undefined; },
  /** @returns Opaque portable source, never split among presentation attributes. */
  addAttributes() { return { diagram: { default: null, rendered: false } }; },
  /** @returns Pure typed host transactions. */
  addCommands() { return describeTextDiagramCommands(textDiagramCommands(), () => this.storage.editor, this.options); },
  /** @returns Facts describing the source to the AI document view. */
  addAiCapabilities() { return textDiagramAiCapabilities; },
  /** @returns Standard Word picture and validated source recovery. */
  addDocx() { return createTextDiagramDocxCodec<QuireJSONContent, NonNullable<QuireJSONContent["marks"]>[number]>(); },
  /** @returns Generic retained-region layout without Word semantics. */
  addLayoutProviders() { return [textDiagramLayout()]; },
  /** @returns Inert HTML preview with explicit edit activation. */
  addNodeView() { return props => textDiagramNodeView(props, this.options); },
  /** @returns Source-preserving clipboard/HTML decoder. */
  parseHTML() { return [{ tag: "figure[data-qk-text-diagram-source]",
    /** @param element - Imported figure. @returns Validated source or refusal. */
    getAttrs(element) {
    try { return { diagram: readTextDiagram(JSON.parse(element.getAttribute("data-qk-text-diagram-source") ?? "null")) }; } catch { return false; }
  } }]; },
  /** @param props - Current node. @returns HTML containing editable source and a safe raster preview. */
  renderHTML({ node }) {
    const diagram = readTextDiagram(node.attrs.diagram);
    const width = Math.min(720, 460 * (diagram.preview ? diagram.preview.width / diagram.preview.height : 12 / 7));
    return ["figure", { "data-qk-text-diagram-source": serializeTextDiagram(diagram), style: `width:100%;max-width:${width}px` },
      diagram.preview ? ["img", { src: diagram.preview.dataUrl, alt: diagram.title, width, style: "display:block;width:100%;height:auto" }] : ["figcaption", {}, diagram.title]];
  },
  /** @param props - Current node. @returns Plain-text fallback for unsupported consumers. */
  renderText({ node }) { return `[文本绘图：${node.attrs.diagram?.title ?? "未命名"}]`; },
  /** @returns Canvas-compatible object activation through public PM handlers. */
  addProseMirrorPlugins() {
    const editor = this.editor, open = this.options.open;
    if (!editor) return [];
    return [new Plugin({ props: {
      transformPasted: forkTextDiagramSlice,
      /** @param _view - Mounted view. @param _pos - Pointer position. @param node - Hit node. @param pos - Atom start. @param _event - Native activation. @param direct - Direct object hit. @returns Whether the task opened. */
      handleDoubleClickOn(_view: EditorView, _pos: number, node: PMNode, pos: number, _event: MouseEvent, direct: boolean) { return direct && node.type.name === "textDiagram" && openTextDiagram(editor, open, pos); },
      /** @param view - Current selection owner. @returns Whether the selected object opened. */
      handleDoubleClick(view: EditorView) { const selection = view.state.selection; return selection instanceof NodeSelection && selection.node.type.name === "textDiagram" && openTextDiagram(editor, open, selection.from); },
      /** @param view - Current selection owner. @param event - Native key. @returns Whether Enter activated the selected textDiagram. */
      handleKeyDown(view, event) { const selection = view.state.selection; return event.key === "Enter" && !event.ctrlKey && !event.metaKey && selection instanceof NodeSelection && selection.node.type.name === "textDiagram" && openTextDiagram(editor, open, selection.from); }
    } })];
  },
});
