import { Node } from "@quirekit/core";
import { NodeSelection, Plugin, type EditorView, type Node as PMNode } from "@quirekit/pm";
import { dataViewCommands } from "./commands";
import { isInteractiveDataView, renderDataView } from "./render";
import { forkDataViewSlice } from "./clipboard";
import { openDataView } from "./open";
import { bindDataViewActivation } from "./activation";
import type { DataViewOptions } from "./types";

/** MIT semantic atom; mounted layout and UI are injected by each host. */
export const DataView = Node.create<DataViewOptions>({
  name: "dataView", group: "block", atom: true, selectable: true, draggable: true,
  /** @returns Hostless defaults. */ addOptions() { return {open: null, layouts: null, render: null}; },
  /** @returns One opaque canonical source attribute. */ addAttributes() { return {dataView: {default: null, rendered: false}}; },
  /** @returns Atomic document commands. */ addCommands() { return dataViewCommands(); },
  /** @returns Host-owned neutral layout registrations. */ addLayoutProviders() { return this.options.layouts?.() ?? []; },
  /** @returns Host-owned HTML surface or the source-preserving static preview. */ addNodeView() { return props => renderDataView(props, this.options); },
  /** @returns Source-preserving HTML import, including unsupported versions. */
  parseHTML() { return [{tag: "figure[data-quirekit-data-view]", getAttrs(element) {
    try { return {dataView: JSON.parse(element.getAttribute("data-quirekit-data-view") ?? "null")}; } catch { return false; }
  }}]; },
  /** @param props - Current node. @returns Source-preserving portable fallback. */
  renderHTML({node}) { return ["figure", {"data-quirekit-data-view": JSON.stringify(node.attrs.dataView)}, ["figcaption", {}, "多维表格（含可编辑源数据）"]]; },
  /** @returns Honest plain-text fallback. */ renderText() { return "[多维表格]"; },
  /** @returns Clipboard identity and canvas object activation behavior. */
  addProseMirrorPlugins() {
    const editor = this.editor, open = this.options.open;
    if (!editor) return [];
    return [new Plugin({
      /** @param view - Actual mount; the editor facade is not attached yet. @returns Activation listener lifetime. */
      view(view) {
        const mounted = view as typeof view & {/** Optional DOM capability omitted by the headless PM interface. */ readonly dom?: HTMLElement};
        return mounted.dom ? {destroy: bindDataViewActivation(editor, mounted.dom, open, position => !isInteractiveDataView(view, position))} : {};
      },
      props: {
      transformPasted: forkDataViewSlice,
      /** @param _view - Mounted view. @param _position - Hit coordinate. @param node - Hit node. @param position - Node start. @param _event - Native event. @param direct - Direct object hit. @returns Activation acceptance. */
      handleDoubleClickOn(view: EditorView, _position: number, node: PMNode, position: number, _event: MouseEvent, direct: boolean) { return direct && node.type.name === "dataView" && !isInteractiveDataView(view, position) && openDataView(editor, open, position); },
      /** @param view - Selection owner. @param event - Native key. @returns Whether Enter opened the atom. */
      handleKeyDown(view, event) { const selection = view.state.selection; return event.key === "Enter" && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && selection instanceof NodeSelection && selection.node.type.name === "dataView" && !isInteractiveDataView(view, selection.from) && openDataView(editor, open, selection.from); }
    }})];
  }
});
