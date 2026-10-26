import { Node, type QuireJSONContent } from "@quirekit/core";
import { createFlowchartDocxCodec } from "@quirekit/flowchart-docx";
import { NodeSelection, Plugin, type EditorView, type Node as PMNode } from "@quirekit/pm";
import { readFlowchartEmbed, serializeFlowchartEmbed, flowchartPreviewSource } from "@quirekit/flowchart";
import { flowchartCommands } from "./commands";
import { flowchartLayout } from "./layout";
import { flowchartNodeView } from "./view";
import { openFlowchart } from "./session";
import { forkFlowchartSlice } from "./clipboard";
import type { FlowchartOptions, FlowchartStorage } from "./types";
import { describeFlowchartCommands } from "./ai/commands";
import { flowchartAiCapabilities } from "./ai/facts";

/** Generic source-backed atom; hosts supply their task UI through options. */
export const Flowchart = Node.create<FlowchartOptions, FlowchartStorage>({
  name: "flowchart", group: "block", atom: true, selectable: true, draggable: true,
  /** @returns Product-owned UI hook, absent in headless consumers. */
  addOptions() { return { open: null, render: null }; },
  /** @returns Editor slot for Agent command preparation. */
  addStorage() { return { editor: undefined }; },
  /** Binds descriptors only after Core has allocated this editor. */
  onBeforeCreate() { this.storage.editor = this.editor; },
  /** Releases the editor reference. */
  onDestroy() { this.storage.editor = undefined; },
  /** @returns Opaque portable source, never split among presentation attributes. */
  addAttributes() { return { flow: { default: null, rendered: false } }; },
  /** @returns Pure typed host transactions. */
  addCommands() { return describeFlowchartCommands(flowchartCommands(), () => this.storage.editor, this.options); },
  /** @returns Facts describing the source to the AI document view. */
  addAiCapabilities() { return flowchartAiCapabilities; },
  /** @returns Standard Word image projection and validated source recovery. */
  addDocx() { return createFlowchartDocxCodec<QuireJSONContent, NonNullable<QuireJSONContent["marks"]>[number]>(); },
  /** @returns Generic retained-region layout without Word semantics. */
  addLayoutProviders() { return [flowchartLayout()]; },
  /** @returns Inert HTML preview with explicit edit activation. */
  addNodeView() { return props => flowchartNodeView(props, this.options); },
  /** @returns Source-preserving clipboard/HTML decoder. */
  parseHTML() { return [{ tag: "figure[data-qk-flowchart-source]",
    /** @param element - Imported figure. @returns Validated source or refusal. */
    getAttrs(element) {
    try { return { flow: readFlowchartEmbed(JSON.parse(element.getAttribute("data-qk-flowchart-source") ?? "null")) }; } catch { return false; }
  } }]; },
  /** @param props - Current node. @returns HTML containing editable source and a safe raster preview. */
  renderHTML({ node }) {
    const flow = readFlowchartEmbed(node.attrs.flow);
    const width = Math.min(720, 460 * (flow.preview ? flow.preview.width / flow.preview.height : 12 / 7));
    return ["figure", { "data-qk-flowchart-source": serializeFlowchartEmbed(flow), style: `width:100%;max-width:${width}px` },
      flow.preview ? ["img", { src: flowchartPreviewSource(flow)!, alt: flow.title, width, style: "display:block;width:100%;height:auto" }] : ["figcaption", {}, flow.title]];
  },
  /** @param props - Current node. @returns Plain-text fallback for unsupported consumers. */
  renderText({ node }) { return `[流程图：${node.attrs.flow?.title ?? "未命名"}]`; },
  /** @returns Canvas-compatible object activation through public PM handlers. */
  addProseMirrorPlugins() {
    const editor = this.editor, open = this.options.open;
    if (!editor) return [];
    return [new Plugin({ props: {
      transformPasted: forkFlowchartSlice,
      /** @param _view - Mounted view. @param _pos - Pointer position. @param node - Hit node. @param pos - Atom start. @param _event - Native activation. @param direct - Direct object hit. @returns Whether the task opened. */
      handleDoubleClickOn(_view: EditorView, _pos: number, node: PMNode, pos: number, _event: MouseEvent, direct: boolean) { return direct && node.type.name === "flowchart" && openFlowchart(editor, open, pos); },
      /** @param view - Current selection owner. @returns Whether the selected object opened. */
      handleDoubleClick(view: EditorView) { const selection = view.state.selection; return selection instanceof NodeSelection && selection.node.type.name === "flowchart" && openFlowchart(editor, open, selection.from); },
      /** @param view - Current selection owner. @param event - Native key. @returns Whether Enter activated the selected flowchart. */
      handleKeyDown(view, event) { const selection = view.state.selection; return event.key === "Enter" && !event.ctrlKey && !event.metaKey && selection instanceof NodeSelection && selection.node.type.name === "flowchart" && openFlowchart(editor, open, selection.from); }
    } })];
  },
});
