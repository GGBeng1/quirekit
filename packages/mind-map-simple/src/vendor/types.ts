import type { MindMapLayout, MindMapAnnotation } from "@quirekit/mind-map";

/** Instance-owned SVG group operations admitted for pure world translation. */
export interface SimpleSvgGroup {
  /** Native element, including transient drag transform projection. */ node: SVGGElement;
  /** @param x - Relative horizontal delta. @param y - Relative vertical delta. @returns The same group. */
  translate(x: number, y: number): SimpleSvgGroup;
  /** @param value - Pure translation with an explicit numeric pivot. @param relative - Compose with the current matrix. @returns The same group. */
  transform(value: { /** World delta. */ translate: [number, number]; /** Pivot, irrelevant for translation. */ origin: [number, number] }, relative: boolean): SimpleSvgGroup;
}

/** Narrow structural view of a vendor node; never exported from the package. */
export interface SimpleNode {
  /** Whether this node is the single root. */
  isRoot: boolean;
  /** Current world bounds. */ left: number;
  /** Current world top. */ top: number;
  /** Measured width. */ width: number;
  /** Measured height. */ height: number;
  /** Renderer depth for style projection. */ layerIndex: number;
  /** Common branch growth direction. */ dir?: "left" | "right" | undefined;
  /** Render traversal children; may include forest roots on the main carrier. */ children: SimpleNode[];
  /** Actual tree parent, null for independent roots. */ parent: SimpleNode | null;
  /** Instance-owned SVG group. */ group?: SimpleSvgGroup;
  /** Outgoing connectors used only for transient drag previews. */ _lines: { /** Native path. */ node: SVGPathElement }[];
  /** Activates this node through the vendor's selection lifecycle. */
  active(): void;
  /** Mutable vendor record; only selection projection writes this directly. */
  nodeData: { /** Transient activation, excluded from canonical data. */ data: { /** Selection flag. */ isActive?: boolean } };
  /** @param active - Whether to render the selection outline. */ updateNodeByActive(active: boolean): void;
  /**
   * Reads a vendor node field.
   * @param key - Vendor field key.
   * @returns Untrusted field value.
   */
  getData(key: string): unknown;
}

/** Plain-text projection requested by the pinned vendor's native input. */
export interface SimpleTextEditChange {
  /** Node owned by the current editing session. */
  node: SimpleNode;
  /** Native input's current plain text. */
  text: string;
  /** Rich-text plugins are outside the admitted adapter. */
  richText: false;
}

/** The pinned vendor surface consumed by this adapter. */
export interface SimpleInstance {
  /** Current vendor permissions used by the asynchronous edit gate. */
  readonly opt: { /** Live authoring permission. */ readonly readonly: boolean; /** Document-owned layout projection. */ layout: string;
    /** Default text consumed only when inserting a root branch. */ defaultInsertSecondLevelNodeText?: string;
    /** Default text consumed only when inserting a deeper topic. */ defaultInsertBelowSecondLevelNodeText?: string;
  };
  /** Current viewport dimensions in CSS pixels. */
  readonly width: number;
  /** Current viewport height in CSS pixels. */
  readonly height: number;
  /** Rendered content geometry; only read for explicit fit/center. */
  readonly draw: {
    /** Instance-owned world-coordinate SVG container. */ readonly node: SVGGElement;
    /** @returns Untransformed content bounds in world coordinates. */
    bbox(): { /** Left. */ x: number; /** Top. */ y: number; /** Width. */ width: number; /** Height. */ height: number };
  };
  /** Internal viewport transform API. */
  readonly view: {
    /** Current uniform scale. */ readonly scale: number;
    /** Current horizontal translation. */ readonly x: number;
    /** Current vertical translation. */ readonly y: number;
    /** @param x - Horizontal delta. @param y - Vertical delta. */
    translateXY(x: number, y: number): void;
    /** @param scale - Absolute scale. @param x - Container anchor. @param y - Container anchor. */
    setScale(scale: number, x?: number, y?: number): void;
  };
  /** Node editing and lookup owned by the vendor. */
  readonly renderer: {
    /** Full history carrier; private forest projection only. */ renderTree: SimpleTree;
    /** Current root of the render walk. */ root: SimpleNode;
    /** Synchronous geometry phases from the pinned layout. */ layout: SimpleLayout;
    /** Recreates geometry strategy from the private layout option without resetting the viewport. */ setLayout(): void;
    /** Visible node cache, maintained by layout. */ nodeCache: Record<string, SimpleNode>;
    /** @param node - Candidate. @returns Index in selection or -1. */ findActiveNodeIndex(node: SimpleNode): number;
    /** @param node - Node to include. */ addNodeToActiveList(node: SimpleNode): void;
    /** @param node - Node to remove. */ removeNodeFromActiveList(node: SimpleNode): void;
    /** Publishes one coalesced selection update. */ emitNodeActiveEvent(): void;
    /** @param change - Native text input, normally scheduled by an uncancellable vendor timer. */
    onNodeTextEditChange(change: SimpleTextEditChange): void;
    /** Current selection, without any host document positions. */
    readonly activeNodeList: SimpleNode[];
    /** Vendor event-deduplication snapshot. */ lastActiveNodeList: SimpleNode[];
    /** Pending selection notification, cancelled by the owned batch projection. */ emitNodeActiveEventTimer: ReturnType<typeof setTimeout> | null;
    /** @param id - Stable vendor uid. @returns Visible node, if found. */
    findNodeByUid(id: string): SimpleNode | undefined;
    /** Local text editing overlay. */
    readonly textEdit: {
      /** Instance-local native input, allocated lazily by the vendor. */
      textEditNode?: HTMLElement;
      /** @returns Literal current input, used by both realtime geometry and commit. */
      getEditText(): string;
      /** @param options - Opaque pinned presentation arguments; coordinate ownership stays upstream. */
      showEditTextBox(options: unknown): void;
      /** @returns Node whose native input currently owns editing, or null. */
      getCurrentEditNode(): SimpleNode | null;
      /** Commits and closes the current plain-text overlay. */
      hideEditTextBox(): void;
      /** @param options - Node to edit. @returns Completion of entering text editing. */
      show(options: { node: SimpleNode }): Promise<void>;
    };
  };
  /** Vendor undo history, separate from the host transaction history. */
  readonly command: {
    /** Index of the current committed history entry. */ readonly activeHistoryIndex: number;
    /** Committed history entries, never exposed to hosts. */ readonly history: readonly unknown[];
    /** Flushes the current data into history synchronously. */
    originAddHistory(): void;
    /** Prevents pending history timers from collecting disposed state. */
    pause(): void;
  };
  /** @param callback - Called at the end of the coalesced layout. */
  render(callback: () => void): void;
  /** @param name - Vendor command. @param args - Internal typed projection arguments. */
  execCommand(name: string, ...args: unknown[]): void;
  /** @param event - Vendor event. @param args - Event payload. */ emit(event: string, ...args: unknown[]): void;
  /** @param event - Vendor event. @param callback - Subscriber. */
  on(event: string, callback: () => void): void;
  /** @param event - Native text change event. @param callback - Plain-text projection subscriber. */
  on(event: "node_text_edit_change", callback: (change: SimpleTextEditChange) => void): void;
  /** @param event - Vendor event. @param callback - Subscriber to remove. */
  off(event: string, callback: () => void): void;
  /** @param event - Native text change event. @param callback - Projection subscriber to remove. */
  off(event: "node_text_edit_change", callback: (change: SimpleTextEditChange) => void): void;
  /** @returns Copy of the vendor tree. */
  getData(): unknown;
  /** @param data - New complete history carrier, retaining existing undo history. */
  updateData(data: SimpleTree): void;
  /** @param config - Presentation-only theme projection. */
  setThemeConfig(config: Record<string, unknown>): void;
  /** @param mode - Vendor's supported authoring mode. */
  setMode(mode: "readonly" | "edit"): void;
  /** @param options - Snapshot padding. @returns Full unscaled SVG content and bounds. */
  getSvgData(options: { paddingX: number; paddingY: number }): {
    /** Complete cloned SVG. */
    svgHTML: string;
    /** Natural content dimensions. */
    rect: { /** Width in CSS px. */ width: number; /** Height in CSS px. */ height: number };
  };
  /** Re-measures the browser mount. */
  resize(): void;
  /** Removes the vendor's DOM, global listeners and style element. */
  destroy(): void;
}

/** Constructor type provided locally because upstream's npm types are missing. */
export interface SimpleConstructor {
  /** @param options - Adapter-owned settings for the pinned upstream version. @returns Vendor instance. */
  new(options: Record<string, unknown>): SimpleInstance;
}

/** Pure projection used to initialize the vendor. */
export interface SimpleTree {
  /** Persistent node data in the admitted subset. */
  data: {
    /** Stable node identity. */
    uid: string;
    /** Literal plain text. */
    text: string;
    /** Expanded visibility state. */
    expand: boolean;
    /** Rich text is deliberately outside this adapter's first contract. */
    richText: false;
    /** Optional root-child direction. */
    dir?: "left" | "right";
    /** Adapter-only transport metadata, excluded from the canonical node. */
    _quirekitFree?: { /** Root-relative x. */ x: number; /** Root-relative y. */ y: number; /** Growth direction. */ side: "left" | "right" };
    /** Adapter transport schema, present only on the main carrier. */ _quirekitVersion?: 2 | 3 | 4 | 5 | 6;
    /** Canonical annotations carried by the same atomic history. */ _quirekitAnnotations?: readonly MindMapAnnotation[];
    /** Layout carried through the same history as the source tree. */ _quirekitLayout?: MindMapLayout;
  };
  /** Ordered subtrees. */
  children: SimpleTree[];
}

/** Narrow pinned layout compatibility seam, hidden from public consumers. */
export interface SimpleLayout {
  /** Direction flag on logical layouts; absent on mind-map layout. */ isUseLeft?: boolean;
  /** Root currently undergoing geometry computation. */ root: SimpleNode;
  /** @param callback - Receives the completed forest render root. */ doLayout(callback: (root: SimpleNode) => void): void;
  /** Measures and connects node instances. */ computedBaseValue(): void;
  /** Places sibling nodes. */ computedTopValue(): void;
  /** Resolves subtree spacing. */ adjustTopValue(): void;
  /** Places organization siblings. */ computedLeftValue?(): void;
  /** Resolves organization spacing. */ adjustLeftValue?(): void;
  /** Places timeline descendants. */ computedLeftTopValue?(): void;
  /** Resolves timeline spacing. */ adjustLeftTopValue?(): void;
  /** @param node - Root to position. */ setNodeCenter(node: SimpleNode): void;
  /** @param data - Node data. @param parent - Source parent. @param root - Tree root flag. @param depth - Local depth.
   * @param index - Sibling order. @param ancestors - Traversal ancestry. @returns Reused or created runtime node. */
  createNode(data: SimpleTree, parent: SimpleTree | null, root: boolean, depth: number, index: number, ancestors: unknown[]): SimpleNode;
  /** @param node - Button owner. @param button - Vendor button object. */ renderExpandBtn(node: SimpleNode, button: unknown): void;
  /** @param node - Outgoing connector owner. @param lines - Connector paths. @param style - Vendor styling callback.
   * @param lineStyle - Admitted line style. */
  renderLine(node: SimpleNode, lines: { /** @param path - SVG path. */ plot(path: string): void }[], style: unknown, lineStyle: unknown): void;
}
