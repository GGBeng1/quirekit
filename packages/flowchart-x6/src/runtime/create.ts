import { bindFlowLocale, setFlowLocale } from "./locale/controls";
import { flowRuntimeText, resolveFlowRuntimeLocale } from "./locale/messages";
import { createFormatReuse } from "./formatting/reuse";
import { createMediaCommands } from "./media/commands";
import { createCaptionCommands } from "./text/commands";
import { createPageCommands } from "./pages/commands";
import { createFlowHistory } from "./history/create";
import { writeGraphPage } from "../codec/metadata";
import { createNavigation } from "./navigation/controller";
import { createGeometryCommands } from "./geometry/properties";
import { createFlowClipboard } from "./input/clipboard/binding";
import { selectedDocument, insertDocument } from "./input/clipboard/operations";
import { bindCrossings } from "./connections/crossings";
import { bindRouteRefresh } from "./connections/routes/refresh";
import { registerFlowRouting } from "./connections/routes/router";
import { isLocked, selectionLocked, syncSelectionPermission, outerGroup } from "./structure/permissions";
import { readFlowchart, canTransformFlowchartShape, isFlowchartContainer, isSequenceParticipant, type FlowchartEdge, type FlowchartNode } from "@quirekit/flowchart";
import type { Graph as X6Graph, Edge } from "@antv/x6";
import type { FlowchartAppearance, FlowchartEditor, FlowchartEditorOptions, FlowchartEditorState } from "../types";
import { toX6Edge } from "../codec/edges";
import { readGraph } from "../codec/read";
import { createTextInput } from "./input/text";
import { bindViewport } from "./input/viewport";
import { bindTransformControls, updateTransformAppearance } from "./input/transform";
import { createCommands, requireIdle } from "./commands";
import { exportFlowPng, exportFlowSvg } from "./snapshot";
import { bindEvents } from "./events";
import { presentCell, presentEdgeTools } from "./presentation";
import type { FlowRuntime } from "./types";
import { appendGraph, nextEdgeLayer } from "./content";
import { initializeDrawing } from "../drawing/rough";
import { registerDrawingAttributes } from "../drawing/attributes";
import { registerRelativeAnchor } from "../codec/anchors";
import { bindStructures } from "./structure/embedding";
import { readNode } from "../codec/read";
import { createSelectionStyleReader } from "./formatting/selection";
import { createFlowPlayback } from "../playback/create";
import { v4 as uuidv4 } from "uuid";
import { createNodePlacement } from "./creation/placement";

const defaultAppearance: FlowchartAppearance = { primary: "#2563eb", surface: "#ffffff", text: "#243247", line: "#64748b", fontFamily: "system-ui, sans-serif" };

/** @param options - Container, portable source and lifetime. @returns Initialized isolated graph, with no vendor object exposed. */
export async function createX6FlowchartEditor(options: FlowchartEditorOptions): Promise<FlowchartEditor> {
  const source = readFlowchart(options.document);
  options.signal?.throwIfAborted();
  const { Graph, History, Selection, Transform, Snapline, Export, routerPresets } = await import("@antv/x6");
  registerFlowRouting(Graph, routerPresets);
  await initializeDrawing(); registerDrawingAttributes(Graph); registerRelativeAnchor(Graph);
  Graph.registerNode("qk-flow-container", { inherit: "rect" }, true);
  Graph.registerNode("qk-flow-lifeline", { inherit: "rect" }, true);
  options.signal?.throwIfAborted();
  const mount = options.container.ownerDocument.createElement("div");
  mount.tabIndex = 0; mount.dataset.quirekitFlowchart = "";
  mount.setAttribute("role", "application");
  Object.assign(mount.style, { position: "relative", width: "100%", height: "100%", overflow: "hidden" });
  options.container.append(mount);
  let runtime: FlowRuntime;
  // Hiding X6's grid keeps its default ten-unit snapping. Use one world unit
  // for native node/selection/resize precision; CSS dots remain display-only.
  const graph: X6Graph = new Graph({ container: mount, async: false, autoResize: false, grid: { size: 1, visible: false },
    panning: { enabled: true, eventTypes: ["mouseWheelDown"] }, mousewheel: false,
    scaling: { min: 0.1, max: 3 },
    /** @param view - Direct gesture target. @returns Permissions without serializing the graph. */
    interacting: view => {
      if (runtime?.readOnly || runtime?.presenting || runtime?.exporting || runtime?.destroyed || isLocked(view.cell)) return false;
      return { nodeMovable: !selectionLocked(runtime), stopDelegateOnDragging: view.cell.getParent()?.getData()?.source?.shape !== "group" };
    },
    connecting: { allowBlank: true, allowLoop: true, allowMulti: true, allowEdge: false, allowNode: true, allowPort: true,
      snap: { radius: 20 }, router: "manhattan", connector: "rounded",
      /** @returns A portable-data-backed connector for the native drag gesture. */
      createEdge(): Edge {
        const edge: FlowchartEdge = { id: `edge-${uuidv4()}`, source: { x: 0, y: 0 }, target: { x: 0, y: 0 },
          vertices: [], routing: "orthogonal", label: "", labelPosition: 0.5, style: runtime.drawing === "standard" ? {} : { drawing: runtime.drawing } };
        // X6 merges the drag attachment with the default terminal. A default x/y
        // would take precedence over cell/port, turning a node attachment into a free point.
        const metadata = toX6Edge(edge, runtime.appearance);
        delete metadata.source; delete metadata.target;
        metadata.zIndex = nextEdgeLayer(runtime);
        return graph.createEdge(metadata);
      },
      /** @param args - Gesture origin. @returns Whether permissions and cell budget permit another connector. */
      validateMagnet: ({ cell }) => !runtime.readOnly && !runtime.presenting && !runtime.exporting && !isLocked(cell) && graph.getCellCount() < 10000,
    },
  });
  runtime = { graph, mount, options: { ...options, document: source }, appearance: options.appearance ?? defaultAppearance, readOnly: options.readOnly ?? false,
    drawing: [...source.nodes, ...source.edges].every(c => c.style.drawing === source.nodes[0]?.style.drawing) ? source.nodes[0]?.style.drawing ?? "standard" : "standard",
    locale: resolveFlowRuntimeLocale(options.locale), localeListeners: new Set(),
    refreshCrossings() {}, presenting: false, destroyed: false, exporting: false, replacing: false, dragging: false, changes: 0,
    /** Publishes the current lightweight state after controller initialization. */ notify() { if (!runtime.destroyed) options.onStateChange?.(state()); },
    /** @param error - Recoverable input or command error. */ fail(error) { options.onError?.(error); },
  };
  bindFlowLocale(runtime, () => { mount.lang = runtime.locale; mount.setAttribute("aria-label", options.label ?? flowRuntimeText(runtime.locale, "流程图编辑区")); });
  const text = createTextInput(runtime);
  const selectionStyle = createSelectionStyleReader();
  let formatReuse: ReturnType<typeof createFormatReuse> | undefined;
  let navigation: ReturnType<typeof createNavigation> | undefined;
  let playback: ReturnType<typeof createFlowPlayback> | undefined;
  let placement: ReturnType<typeof createNodePlacement> | undefined;
  let removeEvents = () => {}, removeWheel = () => {}, removeClipboard = () => {}, removeTransform = () => {};
  const resize = new ResizeObserver(() => { if (!runtime.destroyed) graph.resize(options.container.clientWidth, options.container.clientHeight); });
  /** @returns Selection/history/viewport state without copying source. */
  function state(): FlowchartEditorState {
    const selected = graph.getSelectedCells(), translation = graph.translate();
    const nodes = selected.filter(cell => cell.isNode()).map(cell => cell.getData<{ source: FlowchartNode }>().source);
    const edges = selected.filter(cell => cell.isEdge()).map(cell => cell.getData<{ source: FlowchartEdge }>().source);
    const formatState = formatReuse?.state() ?? { formatKind: null, paintingFormat: false };
    return { ...formatState, selectionLocked: selectionLocked(runtime), selectedIds: selected.map(c => c.id), selectedKind: !selected.length ? null : selected[0]!.isNode() ? "node" : "edge",
      selectedShapes: nodes.map(node => node.shape), selectedStyle: selectionStyle(nodes, edges, runtime.appearance),
      composing: text.isComposing(), readOnly: runtime.readOnly, presenting: runtime.presenting, canUndo: graph.canUndo(), canRedo: graph.canRedo(),
      scale: graph.zoom(), x: translation.tx, y: translation.ty };
  }
  /** Releases exactly this graph's resources; repeated calls are harmless. */
  function destroy(): void {
    if (runtime.destroyed) return;
    placement?.destroy(); runtime.destroyed = true; options.signal?.removeEventListener("abort", destroy);
    resize.disconnect(); removeEvents(); removeWheel(); removeClipboard(); removeTransform(); playback?.destroy(); formatReuse?.destroy(); navigation?.destroy(); text.destroy(); runtime.localeListeners.clear(); graph.dispose(); mount.remove();
  }
  try {
    writeGraphPage(graph, source.page); graph.use(createFlowHistory(runtime, History));
    // Blank left drag belongs to selection; keep middle drag exclusively with
    // Panning because Selection otherwise also listens for mouseWheelDown.
    graph.use(new Selection({ enabled: true, multiple: true, rubberband: true, eventTypes: ["leftMouseDown"],
      /** @param cells - Current retained selection. @returns Pass a single container's hits through to its background and members; multiselection still owns group dragging. */
      pointerEvents: cells => cells.length === 1 && cells[0]!.isNode() && isFlowchartContainer(readNode(cells[0]!).shape) && readNode(cells[0]!).shape !== "group" ? "none" : "auto",
      movable: !runtime.readOnly, movingRouterFallback: "orth", showNodeSelectionBox: true, showEdgeSelectionBox: false }));
    const transform = new Transform({ resizing: {
      /** @param node - Resize target. @returns Whether direct resize is admitted; lifelines extend through message commands. */
      enabled: node => !runtime.readOnly && !runtime.presenting && !runtime.exporting && !isLocked(node) && readNode(node).shape !== "group" && !isSequenceParticipant(readNode(node).shape) && readNode(node).shape !== "destruction",
      minWidth: 20, minHeight: 20,
      /** @param node - Resize target. @returns Whether the current frame ratio is explicitly locked for direct dragging. */
      preserveAspectRatio: node => readNode(node).image?.lockAspectRatio === true,
      /** @param node - Resize target. @returns Fixed activation width or ordinary maximum. */
      maxWidth: node => readNode(node).shape === "activation" ? 20 : 10000,
      /** @param node - Resize target. @returns Activation space left inside its participant. */
      maxHeight: node => readNode(node).shape === "activation" && node.getParent()?.isNode() ? Math.max(20, node.getParent()!.getBBox().bottom - node.getBBox().y) : 10000,
    }, rotating: {
      /** @param node - Gesture target. @returns Whether this ordinary shape may rotate. */
      enabled: node => !runtime.readOnly && !runtime.presenting && !runtime.exporting && !isLocked(node) && !graph.getConnectedEdges(node).some(isLocked) && canTransformFlowchartShape(readNode(node).shape), grid: 1,
    } });
    graph.use(transform);
    removeTransform = bindTransformControls(runtime);
    // Snapline compares world distances; keep its magnetic range at three CSS
    // pixels so zoom never turns a nearby alignment into a long sticky region.
    const snaplinePixels = 3, snapline = new Snapline({ enabled: !runtime.readOnly, tolerance: snaplinePixels / graph.zoom() });
    /** @param scale - Actual world-to-screen projection for this instance. */
    graph.on("scale", scale => { snapline.setTolerance(snaplinePixels / scale.sx); });
    // X6 snaplines operate on the raw pointer target, while grouped dragging
    // delegates to an owner. Disable raw-target snapping for this gesture so
    // a member cannot drift away from the group translation.
    graph.on("node:mousedown", ({ cell }) => snapline.toggleEnabled(!runtime.readOnly && !runtime.presenting && !isLocked(cell) && !selectionLocked(runtime) && outerGroup(cell) === cell && readNode(cell).shape !== "group"));
    graph.use(snapline); graph.use(new Export());
    bindStructures(runtime);
    const refreshRoutes = bindRouteRefresh(runtime), refreshCrossings = bindCrossings(runtime);
    runtime.refreshCrossings = () => { refreshRoutes(); refreshCrossings(); };
    appendGraph(runtime, source); graph.cleanHistory();
    const commands = createCommands(runtime, text);
    placement = createNodePlacement(runtime, text, commands);
    const clipboard = createFlowClipboard(runtime, text); removeClipboard = clipboard.destroy;
    formatReuse = createFormatReuse(runtime, text);
    navigation = createNavigation(runtime, text);
    playback = createFlowPlayback(runtime, text, formatReuse.cancel);
    const controller: FlowchartEditor = { playback: playback.controller, ...commands, ...formatReuse.commands, ...navigation.commands, ...createGeometryCommands(runtime, text), ...createMediaCommands(runtime, text), ...createCaptionCommands(runtime, text), ...createPageCommands(runtime, text),
      copyToClipboard: clipboard.copyToClipboard, pasteFromClipboard: clipboard.pasteFromClipboard,
      beginNodeDrag: placement.beginNodeDrag,
      /** @returns Detached current selection. */ getSelection: () => selectedDocument(runtime, text),
      /** @param document - Fragment to insert. @param point - Optional world location. */ insertDocument: (document, point) => insertDocument(runtime, text, document, point),
      /** @returns Current portable graph with committed native text. */
      async getDocument() { requireIdle(runtime, text); return readGraph(graph, source.revision); },
      getState: state,
      /** @param locale - Host display preference. Native composition and graph state stay untouched. */
      setLocale: locale => setFlowLocale(runtime, locale),
      /** @param value - Current host permission; revocation cancels unfinished text. */
      setReadOnly(value) {
        if (runtime.destroyed) return;
        runtime.readOnly = value; if (value) { placement?.cancel(); text.cancel(); formatReuse?.cancel(); } syncSelectionPermission(runtime);
        graph.getEdges().forEach(edge => presentEdgeTools(edge, runtime));
        transform.clearWidgets(); runtime.notify();
      },
      /** @param appearance - Display-only theme; never part of history. */
      setAppearance(appearance) {
        requireIdle(runtime, text); runtime.appearance = appearance; updateTransformAppearance(runtime);
        graph.getCells().forEach(cell => presentCell(cell, runtime));
        playback?.refreshAppearance();
        runtime.notify();
      },
      /** @returns Source-bound content SVG. */ exportSvg: () => exportFlowSvg(runtime, text),
      /** @param options - PNG appearance. @returns PNG data URL. */ exportPng: options => exportFlowPng(runtime, text, options),
      destroy,
    };
    removeEvents = bindEvents(runtime, text, controller); removeWheel = bindViewport(runtime, text);
    resize.observe(options.container); graph.resize(options.container.clientWidth, options.container.clientHeight);
    options.signal?.addEventListener("abort", destroy, { once: true });
    options.signal?.throwIfAborted(); runtime.notify(); return controller;
  } catch (error) { destroy(); throw error; }
}
