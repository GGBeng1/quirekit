import type { FlowchartImageOptions } from "./export/types";
import type { FlowchartSearchResult } from "./navigation/types";
import type { FlowchartGeometryField, FlowchartGeometryPatch } from "@quirekit/flowchart";
import type { FlowchartNode, FlowchartNodeContent } from "@quirekit/flowchart";
import type { FlowchartArrow, FlowchartCrossing, FlowchartEdgeLayout, FlowchartConnection, FlowchartConnector, FlowchartDocument, FlowchartDrawingStyle, FlowchartEdgeStyle, FlowchartNodeStyle, FlowchartPoint, FlowchartShape, FlowchartSnapshot } from "@quirekit/flowchart";
/** Theme projection without a dependency on the UI package. */
export interface FlowchartAppearance {
  /** Optional transient algorithm-state colors, independent of saved node styles. */ readonly runColors?: import("./playback/types").FlowchartRunColors;
  /** Accent used by outlines and interaction controls. */ readonly primary: string;
  /** Default shape fill. */ readonly surface: string;
  /** Default caption color. */ readonly text: string;
  /** Default edge stroke. */ readonly line: string;
  /** Native/SVG font family. */ readonly fontFamily: string;
}
/** Independent color targets; stroke includes both selected nodes and edges. */
export type FlowchartColorTarget = "fill" | "stroke" | "color";
/** Common effective formatting; null means mixed values or no applicable selection. */
export interface FlowchartSelectionStyle {
  /** Selected node count, including containers. */ readonly nodeCount: number;
  /** Selected connector count. */ readonly edgeCount: number;
  /** Common effective font size. */ readonly fontSize: number | null;
  /** Common effective weight. */ readonly bold: boolean | null;
  /** Common horizontal alignment. */ readonly textAlign: NonNullable<FlowchartNodeStyle["textAlign"]> | null;
  /** Common vertical alignment. */ readonly verticalAlign: NonNullable<FlowchartNodeStyle["verticalAlign"]> | null;
  /** Common additional caption inset. */ readonly padding: number | null;
  /** Common node fill, including theme defaults. */ readonly fill: string | null;
  /** Common node text color, including theme defaults. */ readonly color: string | null;
  /** Common outline across selected nodes and connectors. */ readonly stroke: string | null;
  /** Common connector width in world CSS pixels. */ readonly width: number | null;
  /** Common connector dash choice. */ readonly dashed: boolean | null;
  /** Common route independent of corner interpolation. */ readonly routing: FlowchartConnection["routing"] | null;
  /** Common corner interpolation, including its default. */ readonly connector: FlowchartConnector | null;
  /** Common non-smooth crossing treatment. */ readonly crossing: FlowchartCrossing | null;
  /** Common starting marker. */ readonly sourceArrow: FlowchartArrow | null;
  /** Common ending marker. */ readonly targetArrow: FlowchartArrow | null;
}
/** Lightweight UI projection without graph serialization. */
export interface FlowchartEditorState {
  /** A transient run owns presentation; authoring mutation is blocked until it closes. */ readonly presenting: boolean;
  /** Compatible kind available in this session format clipboard. */ readonly formatKind: "node" | "edge" | null;
  /** Whether a one-shot format painter owns the next canvas click. */ readonly paintingFormat: boolean;
  /** Whether any selected object inherits a lock. */ readonly selectionLocked: boolean;
  /** Current selected cell identities. */ readonly selectedIds: readonly string[];
  /** First selected cell kind. */ readonly selectedKind: "node" | "edge" | null;
  /** Shapes of selected nodes only, without reading the full document. */ readonly selectedShapes: readonly FlowchartShape[];
  /** Selection-only formatting, reused while its source dependencies remain unchanged. */ readonly selectedStyle: FlowchartSelectionStyle;
  /** Native IME currently owns text editing. */ readonly composing: boolean;
  /** Whether mutations are disabled. */ readonly readOnly: boolean;
  /** Whether an undo operation is available. */ readonly canUndo: boolean;
  /** Whether a redo operation is available. */ readonly canRedo: boolean;
  /** Current zoom ratio. */ readonly scale: number;
  /** Viewport horizontal translation. */ readonly x: number;
  /** Viewport vertical translation. */ readonly y: number;
}
/** Admitted authoring commands. */
export type FlowchartCommand = import("@quirekit/flowchart").FlowchartTransform | import("@quirekit/flowchart").SequenceEdit | import("@quirekit/flowchart").FlowchartLayout | import("@quirekit/flowchart").FlowchartArrange | import("@quirekit/flowchart").FlowchartObjectCommand | "undo" | "redo" | "delete" | "duplicate" | "edit-text" | "select-all"
  | "sequence-participant" | "sequence-activation" | "sequence-message" | "sequence-reply"
  | "sequence-actor" | "sequence-async" | "sequence-self" | "sequence-destroy" | "sequence-alt" | "sequence-opt" | "sequence-loop"
  | "edge-reset-bends" | "edge-label-reset" | "edge-label-start" | "edge-label-middle" | "edge-label-end" | "edge-label-above" | "edge-label-on" | "edge-label-below"
  | "edge-label-avoid" | "edge-route-top" | "edge-route-bottom" | "edge-route-left" | "edge-route-right"
  | "swimlane-add" | "swimlane-remove" | "swimlane-before" | "swimlane-after" | "swimlane-equalize" | "swimlane-phase";
/** One isolated browser mount, with explicit lifetime. */
export interface FlowchartEditorOptions {
  /** Interface language for native controls and newly created defaults. */ readonly locale?: string;
  /** Empty container owned by this instance. */ readonly container: HTMLElement;
  /** Validated portable source. */ readonly document: FlowchartDocument;
  /** Optional presentation theme. */ readonly appearance?: FlowchartAppearance;
  /** Initial permission. */ readonly readOnly?: boolean;
  /** Accessible surface name. */ readonly label?: string;
  /** Cancels pending initialization and active lifetime. */ readonly signal?: AbortSignal;
  /** @param count - Monotonic content invalidation count, without copying source. */ readonly onChange?: (count: number) => void;
  /** @param state - Lightweight UI projection. */ readonly onStateChange?: (state: FlowchartEditorState) => void;
  /** @param point - Context request in viewport CSS pixels, after selection resolution. */ readonly onContextMenu?: (point: FlowchartPoint) => void;
  /** @param id - Image target selected by double-click or F2; the host owns the content dialog. */ readonly onImageEdit?: (id: string) => void;
  /** @param error - Runtime input error. */ readonly onError?: (error: unknown) => void;
}
/** On-demand exact property snapshot, tied to one selection and source generation. */
export interface FlowchartGeometrySelection {
  /** Opaque lifetime/content/selection identity, revalidated by setGeometry. */ readonly token: string;
  /** Outermost selected node count. */ readonly count: number;
  /** Common root values; null represents mixed or unavailable data. */ readonly values: Readonly<Record<FlowchartGeometryField, number | null>>;
  /** Structural capability per field, before permission checks. */ readonly editable: Readonly<Record<FlowchartGeometryField, boolean>>;
}
/** Vendor-independent authoring controller. */
export interface FlowchartEditor {
  /** Transient, vendor-neutral execution visualization for this graph lifetime. */ readonly playback: import("@quirekit/flowchart").FlowchartPlayback;
  /** @param locale - Display language; preserves content, history and unfinished native input. */ setLocale(locale: string): void;
  /** @returns Source after committing pending native text; rejects during composition/drag. */ getDocument(): Promise<FlowchartDocument>;
  /** @returns Detached selected nodes, descendants and connectors. */ getSelection(): FlowchartDocument;
  /** @param document - Valid fragment, assigned fresh IDs. @param point - Optional world top-left; defaults to viewport center. */ insertDocument(document: FlowchartDocument, point?: FlowchartPoint): void;
  /** @param cut - Remove only after successful write and target revalidation. @returns Completion of explicit clipboard write. */ copyToClipboard(cut?: boolean): Promise<void>;
  /** @returns Completion of explicit clipboard read and guarded insertion. */ pasteFromClipboard(): Promise<void>;
  /** Copies one selected object’s canonical presentation into this session. */ copyFormat(): void;
  /** Applies copied presentation to compatible selected objects, in one history entry. */ pasteFormat(): void;
  /** @param enabled - Capture current source and start one-shot painting, or cancel. */ setFormatPainter(enabled: boolean): void;
  /** @returns Lightweight current UI state. */ getState(): FlowchartEditorState;
  /** @param document - Complete replacement content retaining the host revision. */ replaceDocument(document: FlowchartDocument): void;
  /** @param page - Complete physical output configuration. @param expected - Optional opening metadata, preserving absent legacy settings. */ setPage(page: import("@quirekit/flowchart").FlowchartPageSettings, expected?: Pick<FlowchartDocument, "page">): void;
  /** @param shape - Shape kind. @param point - Optional world insertion point. @returns New shape identity. */ addNode(shape: FlowchartShape, point?: FlowchartPoint): string;
  /** @param shape - Palette shape. @param event - Original primary pointer press. Starts a transient drag; release over the canvas creates one node. */ beginNodeDrag(shape: FlowchartShape, event: PointerEvent): void;
  /** @param image - Self-contained checked resource. @param point - Optional world top-left. @returns New image-node identity. */ addImage(image: import("@quirekit/flowchart").FlowchartImage, point?: FlowchartPoint): string;
  /** @param id - Existing image target. @param image - Replacement resource. @param expected - Opening snapshot rejecting stale drafts. */ setImage(id: string, image: import("@quirekit/flowchart").FlowchartImage, expected?: FlowchartNode): void;
  /** @param ids - Identities to select. */ select(ids: readonly string[]): void;
  /** @returns On-demand root geometry without reading unrelated graph source. */ getGeometry(): FlowchartGeometrySelection;
  /** @param patch - Explicit fields only. @param expected - Snapshot rejecting stale targets. */ setGeometry(patch: FlowchartGeometryPatch, expected: FlowchartGeometrySelection): void;
  /** @param shape - Ordinary replacement preserving other fields and connections. @param expected - Optional opening snapshot rejecting stale targets. */ replaceShape(shape: FlowchartShape, expected?: FlowchartGeometrySelection): void;
  /** @param options - Direction and ordinary shape relative to the selected node. @returns New node identity after one atomic creation. */ addConnectedNode(options: import("@quirekit/flowchart").FlowchartQuickCreate): string;
  /** @param delta - Zoom-independent movement of the current selection, validated before one history batch. */ moveSelection(delta: FlowchartPoint): void;
  /** @param command - Admitted intent. */ execute(command: FlowchartCommand): void;
  /** @param id - Existing target. @param content - Validated content, expanded in one history transaction. @param expected - Optional opening snapshot rejecting stale drafts. */ setNodeContent(id: string, content: FlowchartNodeContent, expected?: FlowchartNode): void;
  /** @param id - Ordinary caption target. @param text - Complete Unicode text. @param spans - Complete partial formats. @param expected - Optional opening snapshot. */ setTextContent(id: string, text: string, spans: readonly import("@quirekit/flowchart").FlowchartTextSpan[], expected?: FlowchartNode): void;
  /** @param style - Explicit shape style overrides. */ setNodeStyle(style: FlowchartNodeStyle): void;
  /** @param style - Explicit connector style overrides. */ setEdgeStyle(style: FlowchartEdgeStyle): void;
  /** @param target - Independent color channel. @param color - Opaque six-digit HEX; mixed node/edge stroke is one history operation. */ setColor(target: FlowchartColorTarget, color: string): void;
  /** @param layout - Selected connections only; one validated history batch. */ setEdgeLayout(layout: FlowchartEdgeLayout): void;
  /** @param connection - Routing and corners for selected edges, preserving manual bends. */ setEdgeConnection(connection: FlowchartConnection): void;
  /** @param drawing - Preset for selected cells, or every cell when selection is empty; also updates the session creation tool. */ setDrawingStyle(drawing: FlowchartDrawingStyle): void;
  /** @param value - New host permission. */ setReadOnly(value: boolean): void;
  /** @param appearance - Display-only theme. */ setAppearance(appearance: FlowchartAppearance): void;
  /** Fits all graph content in the container. */ fit(): void;
  /** Fits selected objects without changing content or history. */ fitSelection(): void;
  /** @param query - Literal case-insensitive display text. @param limit - Result cap, 1–200, default 50. @returns Exact total and bounded matches. */ searchNodes(query: string, limit?: number): FlowchartSearchResult;
  /** @param listener - Called once per completed text/structure change batch. @returns Subscription cleanup. */ subscribeSearch(listener: () => void): () => void;
  /** @param id - Current node identity to select and center. */ locateNode(id: string): void;
  /** @param container - Consumer-owned minimap mount. @returns Cleanup; also automatically released on editor destruction. */ mountOverview(container: HTMLElement): () => void;
  /** @param scale - Absolute zoom ratio, clamped to 10%–300%. */ setZoom(scale: number): void;
  /** Moves keyboard focus into this instance. */ focus(): void;
  /** @returns Exact source-bound content SVG. */ exportSvg(): Promise<FlowchartSnapshot>;
  /** @param options - Optional resolution/background; oversized output automatically lowers resolution. @returns Content PNG data URL. */ exportPng(options?: FlowchartImageOptions): Promise<string>;
  /** Releases all listeners, native inputs and vendor objects. */ destroy(): void;
}
