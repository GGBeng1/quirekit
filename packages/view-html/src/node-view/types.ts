import type {
  QuireMarkViewConstructor,
  QuireMarkViewMap,
  QuireMountedEditorView,
  QuireNodeViewConstructor,
  QuireNodeViewGetPos,
  QuireNodeViewMap,
  QuireViewMutationRecord
} from "@quirekit/core";
import type {
  Decoration,
  DecorationAttrs,
  DecorationSource,
  Mark,
  Node as ProseMirrorNode
} from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { HtmlDescriptorDiagnostic } from "../descriptors";

/** Exact extension-factory environment consumed by retained HTML descriptors. */
export interface HtmlNodeViewEnvironment {
  /** Mounted QuireKit view passed to node and mark factories. */
  readonly view: QuireMountedEditorView;
  /** Exact node factories keyed by schema node type name. */
  readonly nodeViews: QuireNodeViewMap;
  /** Exact mark factories keyed by schema mark type name. */
  readonly markViews: QuireMarkViewMap;
  /**
   * Reads the current decoration source without caching editor state.
   *
   * @returns Current renderer-neutral decoration source.
   */
  readonly getDecorations: () => DecorationSource;
}

/** Decorations supplied to one node view creation or update. */
export interface HtmlNodeViewDecorationState {
  /** Decorations intersecting the represented node range. */
  readonly decorations: readonly Decoration[];
  /** Current renderer-neutral inner decoration source. */
  readonly innerDecorations: DecorationSource;
}

/** One direct PM child or keyed widget after local decoration iteration. */
export interface HtmlDecoratedChild {
  /** Merged presentation attributes for a split text slice. */
  readonly inlineAttrs?: Readonly<DecorationAttrs> | undefined;
  /** Semantic product kind. */
  readonly kind: "node" | "text" | "widget";
  /** Canonical node or split text fragment. */
  readonly node?: ProseMirrorNode | undefined;
  /** Absolute retained document range. */
  readonly range: QuireDocumentRange;
  /** Parent-local outer decorations for a non-text node. */
  readonly outerDecorations?: readonly Decoration[] | undefined;
  /** Child-local decoration source for a non-text node. */
  readonly innerDecorations?: DecorationSource | undefined;
  /** Valid keyed widget facts. */
  readonly widget?: HtmlKeyedWidgetFacts | undefined;
}

/** Validated DOM ownership returned by structural factory inspection. */
export interface HtmlValidatedViewMount {
  /** Factory-owned root DOM element. */
  readonly dom: HTMLElement;
  /** Optional editable content boundary. */
  readonly contentDOM: HTMLElement | null;
  /** Whether contentDOM is contained by the root DOM. */
  readonly contentValid: boolean;
}

/** Internal structural NodeView shape validated by the HTML runtime. */
export interface HtmlNodeViewInstance {
  /** Factory-owned root DOM element. */
  readonly dom: HTMLElement;
  /** Optional editable content boundary. */
  readonly contentDOM?: HTMLElement | null | undefined;
  /** Whether one instance may update across node types. */
  readonly multiType?: boolean | undefined;
  /** Optional custom update authority. */
  readonly update?: ((node: ProseMirrorNode, decorations: readonly Decoration[], innerDecorations: DecorationSource) => boolean) | undefined;
  /** Optional DOM event authority. */
  readonly stopEvent?: ((event: Event) => boolean) | undefined;
  /** Optional DOM mutation authority. */
  readonly ignoreMutation?: ((record: QuireViewMutationRecord) => boolean) | undefined;
  /** Optional lifecycle cleanup. */
  readonly destroy?: (() => void) | undefined;
}

/** Internal structural MarkView shape validated by the HTML runtime. */
export interface HtmlMarkViewInstance {
  /** Factory-owned root DOM element. */
  readonly dom: HTMLElement;
  /** Optional explicit inline content boundary. */
  readonly contentDOM?: HTMLElement | null | undefined;
  /** Optional DOM mutation authority. */
  readonly ignoreMutation?: ((record: QuireViewMutationRecord) => boolean) | undefined;
  /** Optional lifecycle cleanup. */
  readonly destroy?: (() => void) | undefined;
}

/** Explicit validated facts for one keyed widget decoration. */
export interface HtmlKeyedWidgetFacts {
  /** Stable widget identity. */
  readonly key: string;
  /** Collapsed document position. */
  readonly position: number;
  /** Mapping and ordering association. */
  readonly side: number;
  /** Canonical widget decoration. */
  readonly decoration: Decoration;
}

/** Inputs used to instantiate one exact node view factory. */
export interface CreateHtmlNodeViewHostOptions {
  /** Descriptor identity associated with host diagnostics. */
  readonly descriptorId: string;
  /** Initial ProseMirror node represented by the host. */
  readonly node: ProseMirrorNode;
  /** Mounted QuireKit view passed to the extension factory. */
  readonly view: QuireMountedEditorView;
  /** Live descriptor-owned position resolver. */
  readonly getPos: QuireNodeViewGetPos;
  /** Initial decorations active on the node. */
  readonly decorations: readonly Decoration[];
  /** Initial decorations active inside node content. */
  readonly innerDecorations: DecorationSource;
  /** Exact node-type factory selected from the extension manager. */
  readonly factory: QuireNodeViewConstructor;
  /** Mutable retained descriptor diagnostic sink. */
  readonly diagnostics: HtmlDescriptorDiagnostic[];
}

/** Next canonical state offered to one retained node view host. */
export interface HtmlNodeViewUpdate {
  /** Next ProseMirror node represented by the host. */
  readonly node: ProseMirrorNode;
  /** Next decorations active on the node. */
  readonly decorations: readonly Decoration[];
  /** Next decorations active inside node content. */
  readonly innerDecorations: DecorationSource;
}

/** Canonical framework-neutral HTML node view lifecycle. */
export interface HtmlNodeViewHost {
  /** Exact extension factory that owns compatibility authority. */
  readonly factory: QuireNodeViewConstructor;
  /** Stable renderer or framework instance returned by the factory. */
  readonly instance: HtmlNodeViewInstance;
  /** Root DOM element owned by the instance. */
  readonly dom: HTMLElement;
  /** Editable content boundary, or null for an opaque node view. */
  readonly contentDOM: HTMLElement | null;
  /**
   * Reports whether this host may represent a candidate node type.
   *
   * @param node - Candidate node offered by retained reconciliation.
   * @returns Whether same-type or explicit multiType semantics permit the node.
   */
  canRepresent(node: ProseMirrorNode): boolean;
  /**
   * Offers the next canonical node and decorations to the retained instance.
   *
   * @param input - Next node and decoration state.
   * @returns Whether the existing instance accepted the update.
   */
  update(input: HtmlNodeViewUpdate): boolean;
  /**
   * Routes one DOM event through the exact node view instance.
   *
   * @param event - DOM event to route.
   * @returns Instance decision, or false when the capability is absent.
   */
  stopEvent(event: Event): boolean;
  /**
   * Routes one mutation through the exact node view instance.
   *
   * @param record - Mutation or selection record to route.
   * @returns Instance decision, or false when the capability is absent.
   */
  ignoreMutation(record: QuireViewMutationRecord): boolean;
  /** Releases the instance exactly once. */
  destroy(): void;
}

/** Inputs used to instantiate one exact mark view factory. */
export interface CreateHtmlMarkViewHostOptions {
  /** Descriptor identity associated with host diagnostics. */
  readonly descriptorId: string;
  /** ProseMirror mark represented by the host. */
  readonly mark: Mark;
  /** Mounted QuireKit view passed to the extension factory. */
  readonly view: QuireMountedEditorView;
  /** Whether the represented mark is inline. */
  readonly inline: boolean;
  /** Exact mark-type factory selected from the extension manager. */
  readonly factory: QuireMarkViewConstructor;
  /** Mutable retained descriptor diagnostic sink. */
  readonly diagnostics: HtmlDescriptorDiagnostic[];
}

/** Canonical framework-neutral HTML mark view lifecycle. */
export interface HtmlMarkViewHost {
  /** Exact extension factory that owns this mark view. */
  readonly factory: QuireMarkViewConstructor;
  /** Stable renderer or framework instance returned by the factory. */
  readonly instance: HtmlMarkViewInstance;
  /** Root DOM element owned by the instance. */
  readonly dom: HTMLElement;
  /** Editable inline-content boundary, when supplied. */
  readonly contentDOM: HTMLElement | null;
  /**
   * Routes one mutation through the exact mark view instance.
   *
   * @param record - Mutation or selection record to route.
   * @returns Instance decision, or false when the capability is absent.
   */
  ignoreMutation(record: QuireViewMutationRecord): boolean;
  /** Releases the instance exactly once. */
  destroy(): void;
}
