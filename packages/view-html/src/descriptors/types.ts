import type {
  QuireMarkViewConstructor,
  QuireNodeViewConstructor
} from "@quirekit/core";
import type { Decoration, DecorationAttrs, Mark, Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  HtmlMarkViewHost,
  HtmlNodeViewEnvironment,
  HtmlNodeViewHost
} from "../node-view/types";

/** Resolves an explicitly supplied child source without inventing document ids. */
export type HtmlDescriptorSourceResolver = (
  node: ProseMirrorNode,
  inherited: QuireLayoutSourceRef
) => QuireLayoutSourceRef;

/** Kinds owned by the retained HTML descriptor tree. */
export type HtmlDescriptorKind =
  | "document"
  | "node"
  | "text"
  | "mark"
  | "inline-decoration"
  | "widget"
  | "node-view"
  | "composition";

/** Reconciliation state owned by one retained descriptor. */
export type HtmlDescriptorDirtyState = "clean" | "mapped" | "dirty" | "invalid";

/** Stable diagnostics emitted while creating schema-owned HTML descriptors. */
export type HtmlDescriptorDiagnosticCode =
  | "html-node-to-dom-missing"
  | "html-node-to-dom-invalid"
  | "html-node-content-hole-missing"
  | "html-node-content-hole-invalid"
  | "html-mark-to-dom-missing"
  | "html-mark-to-dom-invalid"
  | "html-node-view-dom-invalid"
  | "html-node-view-content-dom-invalid"
  | "html-mark-view-dom-invalid"
  | "html-mark-view-content-dom-invalid"
  | "html-widget-dom-invalid"
  | "html-source-identity-duplicate";

/** Detachable browser product owned by one retained descriptor. */
export interface HtmlDescriptorMount {
  /** Root DOM node realized for the descriptor. */
  readonly dom: globalThis.Node;
  /** DOM node that accepts retained child mounts, when one exists. */
  readonly contentDOM: HTMLElement | null;
}

/** Inputs shared by concrete descriptor runtime constructors. */
export interface DescriptorRuntimeOptions {
  /** Stable descriptor identity. */
  readonly id: string;
  /** Retained parent, or null for a root. */
  readonly parent: HtmlContainerDesc | null;
  /** Canonical source identity. */
  readonly source: HtmlContainerDesc["source"];
  /** Current document range. */
  readonly range: QuireDocumentRange;
  /** Initial detachable browser product. */
  readonly mount: HtmlDescriptorMount | null;
}

/** Base lifecycle and identity shared by all retained HTML descriptors. */
export interface HtmlDescriptorBase {
  /** Stable identity within one retained HTML document view. */
  readonly id: string;
  /** Discriminator for descriptor-specific behavior. */
  readonly kind: HtmlDescriptorKind;
  /** Retained parent, or null for the document root and detached fixtures. */
  parent: HtmlContainerDesc | null;
  /** Current mounted browser product, or null while detached. */
  mount: HtmlDescriptorMount | null;
  /** Canonical source identity supplied by the owning view contract. */
  readonly source: QuireLayoutSourceRef;
  /** Current mapped document range owned by this descriptor. */
  range: QuireDocumentRange;
  /** Geometry epoch last measured for the current mount. */
  geometryEpoch: number;
  /** Current reconciliation state maintained by the document runtime. */
  readonly dirtyState: HtmlDescriptorDirtyState;
  /** Whether descriptor ownership has been permanently released. */
  readonly destroyed: boolean;
  /**
   * Attaches a browser product without changing semantic identity.
   *
   * @param mount - Browser product to attach.
   */
  attachMount(mount: HtmlDescriptorMount): void;
  /**
   * Detaches and returns the current browser product.
   *
   * @returns Detached browser product, or null when already detached.
   */
  detachMount(): HtmlDescriptorMount | null;
  /**
   * Advances the descriptor's internal reconciliation state.
   *
   * @param state - Next reconciliation state.
   */
  setDirtyState(state: HtmlDescriptorDirtyState): void;
  /** Permanently releases this descriptor, its descendants, and its mount. */
  destroy(): void;
}

/** Descriptor that owns an ordered retained child list. */
export interface HtmlContainerDescriptorBase extends HtmlDescriptorBase {
  /** Retained children in document order. */
  readonly children: readonly HtmlDescriptor[];
  /**
   * Adopts an ordered child list while preserving retained child identities.
   *
   * @param children - Children to own in document order.
   */
  adoptChildren(children: readonly HtmlDescriptor[]): void;
}

/** Runtime-owned descriptor for the complete HTML document. */
export interface HtmlDocumentDesc extends HtmlContainerDescriptorBase {
  /** Document descriptor discriminator. */
  readonly kind: "document";
  /** ProseMirror document represented by this descriptor tree. */
  readonly node: ProseMirrorNode;
  /**
   * Updates the represented document without replacing the root descriptor.
   *
   * @param node - Next ProseMirror document node.
   * @param range - Next document content range.
   */
  updateNode(node: ProseMirrorNode, range: QuireDocumentRange): void;
}

/** Schema-node descriptor created from one non-text ProseMirror node. */
export interface HtmlNodeDesc extends HtmlContainerDescriptorBase {
  /** Schema-node descriptor discriminator. */
  readonly kind: "node";
  /** ProseMirror node represented by this descriptor. */
  readonly node: ProseMirrorNode;
  /**
   * Updates the represented schema node and mapped outer range.
   *
   * @param node - Compatible replacement schema node.
   * @param range - Next mapped outer range.
   */
  updateNode(node: ProseMirrorNode, range: QuireDocumentRange): void;
}

/** Direct text-node owner inside the retained HTML tree. */
export interface HtmlTextDesc extends HtmlDescriptorBase {
  /** Text descriptor discriminator. */
  readonly kind: "text";
  /** ProseMirror text node represented by this descriptor. */
  node: ProseMirrorNode;
  /**
   * Replaces the represented text node and patches its mounted text directly.
   *
   * @param node - Replacement ProseMirror text node.
   * @param range - Exact document range occupied by the replacement text.
   * @param patchDOM - Whether to patch the mounted text node directly.
   */
  updateText(
    node: ProseMirrorNode,
    range: QuireDocumentRange,
    patchDOM?: boolean
  ): void;
}

/** Presentation-only inline wrapper; contributes no canonical positions or marks. */
export interface HtmlInlineDecorationDesc extends HtmlContainerDescriptorBase {
  /** Presentation descriptor discriminator. */
  readonly kind: "inline-decoration";
  /** Immutable, merged attributes that define this wrapper's shape. */
  readonly attrs: Readonly<DecorationAttrs>;
  /** Text slice represented inside the wrapper. */
  node: ProseMirrorNode;
}

/** Retained wrapper for one schema-rendered ProseMirror mark. */
export interface HtmlMarkDesc extends HtmlContainerDescriptorBase {
  /** Mark descriptor discriminator. */
  readonly kind: "mark";
  /** ProseMirror mark represented by this descriptor. */
  readonly mark: Mark;
  /** Exact custom mark-view factory, or null for schema rendering. */
  readonly factory: QuireMarkViewConstructor | null;
  /** Retained custom mark-view host, or null for schema or invalid output. */
  readonly host: HtmlMarkViewHost | null;
  /**
   * Updates the represented mark and mapped text span.
   *
   * @param mark - Compatible replacement mark.
   * @param range - Next mapped text span.
   */
  updateMark(mark: Mark, range: QuireDocumentRange): void;
}

/** Retained descriptor for one decoration widget. */
export interface HtmlWidgetDesc extends HtmlDescriptorBase {
  /** Widget descriptor discriminator. */
  readonly kind: "widget";
  /** Stable ProseMirror widget key used for retained identity. */
  readonly key: string;
  /** Current keyed widget decoration represented by this descriptor. */
  readonly decoration: Decoration;
  /** Widget association side used while mapping its collapsed position. */
  readonly side: number;
  /**
   * Advances a retained keyed widget without recreating its DOM.
   *
   * @param decoration - Regenerated equivalent keyed decoration.
   * @param range - Next collapsed widget range.
   * @param side - Next widget mapping association.
   */
  updateWidget(
    decoration: Decoration,
    range: QuireDocumentRange,
    side: number
  ): void;
}

/** Retained descriptor whose browser product is owned by a NodeView host. */
export interface HtmlNodeViewDesc extends HtmlContainerDescriptorBase {
  /** NodeView descriptor discriminator. */
  readonly kind: "node-view";
  /** ProseMirror node represented by the NodeView. */
  readonly node: ProseMirrorNode;
  /** Exact custom node-view factory that owns compatibility. */
  readonly factory: QuireNodeViewConstructor;
  /** Retained host, or null when exact factory output was invalid. */
  readonly host: HtmlNodeViewHost | null;
  /**
   * Updates the represented node and mapped outer range.
   *
   * @param node - Compatible replacement schema node.
   * @param range - Next mapped outer range.
   */
  updateNode(node: ProseMirrorNode, range: QuireDocumentRange): void;
}

/** Transient descriptor for in-flow IME preedit content. */
export interface HtmlCompositionDesc extends HtmlDescriptorBase {
  /** Composition descriptor discriminator. */
  readonly kind: "composition";
  /** Current preedit text represented by the transient mount. */
  text: string;
  /** Text node carrying the current preedit string inside the transient mount. */
  readonly textDOM: Text;
  /**
   * Patches the active preedit without replacing its DOM identity.
   *
   * @param range - Current canonical range replaced by the preedit.
   * @param text - Current visible preedit string.
   * @param presentation - Semantic IME presentation resolved by the surface.
   */
  update(
    range: QuireDocumentRange,
    text: string,
    presentation: HtmlCompositionPresentation
  ): void;
}

/** Semantic presentation applied to one in-flow HTML preedit. */
export interface HtmlCompositionPresentation {
  /** Whether the preedit receives a background fill. */
  readonly background: boolean;
  /** CSS color used for the optional preedit background. */
  readonly backgroundFillStyle: string;
  /** Whether the preedit receives the standard underline affordance. */
  readonly underline: boolean;
}

/** Inputs used to create one session-owned composition descriptor. */
export interface CreateHtmlCompositionDescriptorOptions {
  /** Stable identity for the current composition session. */
  readonly id: string;
  /** Retained container whose inherited DOM flow hosts the preedit. */
  readonly parent: HtmlContainerDesc;
  /** Canonical source identity inherited from the retained owner. */
  readonly source: QuireLayoutSourceRef;
  /** Canonical document range temporarily represented by the preedit. */
  readonly range: QuireDocumentRange;
  /** Current visible preedit text. */
  readonly text: string;
  /** Browser document used to create the transient DOM product. */
  readonly ownerDocument: Document;
  /** Semantic surface presentation for the preedit. */
  readonly presentation: HtmlCompositionPresentation;
}

/** Descriptor variants that may own retained children. */
export type HtmlContainerDesc =
  | HtmlDocumentDesc
  | HtmlNodeDesc
  | HtmlMarkDesc
  | HtmlInlineDecorationDesc
  | HtmlNodeViewDesc;

/** Every descriptor variant in the retained HTML tree. */
export type HtmlDescriptor =
  | HtmlContainerDesc
  | HtmlTextDesc
  | HtmlWidgetDesc
  | HtmlCompositionDesc;

/** Mutable container surface used only by creation and reconciliation code. */
export type MutableHtmlContainerDescriptor = HtmlContainerDesc & {
  /** Mutable child storage hidden behind the readonly public contract. */
  readonly mutableChildren: HtmlDescriptor[];
};

/** One explicit schema-to-DOM gap discovered during descriptor creation. */
export interface HtmlDescriptorDiagnostic {
  /** Stable diagnostic code suitable for gates and tests. */
  readonly code: HtmlDescriptorDiagnosticCode;
  /** Descriptor identity whose schema DOM contract failed. */
  readonly descriptorId: string;
  /** ProseMirror node or mark type associated with the gap. */
  readonly typeName: string;
  /** Human-readable diagnostic detail. */
  readonly message: string;
}

/** Result of creating one retained descriptor subtree. */
export interface HtmlDescriptorCreationResult<TDescriptor extends HtmlDescriptor> {
  /** Root descriptor created for the request. */
  readonly descriptor: TDescriptor;
  /** Schema contract gaps discovered while creating the subtree. */
  readonly diagnostics: readonly HtmlDescriptorDiagnostic[];
}

/** Inputs shared by retained descriptor construction. */
export interface HtmlDescriptorCreationOptions {
  /** Stable descriptor identity chosen by the owning document view. */
  readonly id: string;
  /** Browser document used to create mounted DOM products. */
  readonly ownerDocument: Document;
  /** Canonical source identity supplied by the owning view contract. */
  readonly source: QuireLayoutSourceRef;
  /** Optional document-owned allocator used for descendant descriptor ids. */
  readonly allocateId?: (() => string) | undefined;
  /** Optional resolver for genuinely distinct source identities supplied by nodes. */
  readonly resolveSource?: HtmlDescriptorSourceResolver | undefined;
  /** Optional exact node/mark factory environment for retained custom views. */
  readonly nodeViewEnvironment?: HtmlNodeViewEnvironment | undefined;
}

/** Inputs used to create a retained HTML document descriptor. */
export interface CreateHtmlDocumentDescriptorOptions
  extends HtmlDescriptorCreationOptions {
  /** ProseMirror document node to represent. */
  readonly documentNode: ProseMirrorNode;
}

/** Inputs used to create one retained non-text schema node descriptor. */
export interface CreateHtmlNodeDescriptorOptions
  extends HtmlDescriptorCreationOptions {
  /** ProseMirror node to represent. */
  readonly node: ProseMirrorNode;
  /** Retained parent, or null for a detached construction fixture. */
  readonly parent: HtmlContainerDesc | null;
  /** Exact outer document range owned by the node. */
  readonly range: QuireDocumentRange;
}

/** Inputs used while creating a text node and its optional mark chain. */
export interface CreateHtmlTextDescriptorOptions {
  /** Presentation attributes outside the canonical mark chain. */
  readonly inlineAttrs?: Readonly<DecorationAttrs> | undefined;
  /** First canonical mark to realize when reconciling a nested mark chain. */
  readonly markIndex?: number | undefined;
  /** Stable base identity for the text or outer mark descriptor. */
  readonly id: string;
  /** ProseMirror text node to represent. */
  readonly node: ProseMirrorNode;
  /** Retained parent for the outer descriptor. */
  readonly parent: HtmlContainerDesc;
  /** Canonical source identity inherited from the owning tree. */
  readonly source: HtmlContainerDesc["source"];
  /** Exact document range occupied by the text. */
  readonly range: QuireDocumentRange;
  /** Browser document used to create DOM products. */
  readonly ownerDocument: Document;
  /** Mutable diagnostic output for the complete construction request. */
  readonly diagnostics: HtmlDescriptorDiagnostic[];
  /** Optional document-owned allocator for nested mark and text ids. */
  readonly allocateId?: (() => string) | undefined;
  /** Optional exact node/mark factory environment. */
  readonly nodeViewEnvironment?: HtmlNodeViewEnvironment | undefined;
}

/** Runtime constructor inputs for one retained NodeView descriptor. */
export interface HtmlNodeViewDescriptorRuntimeOptions extends DescriptorRuntimeOptions {
  /** ProseMirror node represented by the custom view. */
  readonly node: ProseMirrorNode;
  /** Exact factory that created the custom view. */
  readonly factory: QuireNodeViewConstructor;
  /** Validated host, or null after invalid exact factory output. */
  readonly host: HtmlNodeViewHost | null;
}

/** Runtime constructor inputs for one retained mark descriptor. */
export interface HtmlMarkDescriptorRuntimeOptions extends DescriptorRuntimeOptions {
  /** ProseMirror mark represented by the descriptor. */
  readonly mark: Mark;
  /** Exact custom mark factory, or null for schema rendering. */
  readonly factory?: QuireMarkViewConstructor | null | undefined;
  /** Validated custom mark host, or null for schema or invalid output. */
  readonly host?: HtmlMarkViewHost | null | undefined;
}

/** Runtime constructor inputs for one retained keyed widget descriptor. */
export interface HtmlWidgetDescriptorRuntimeOptions extends DescriptorRuntimeOptions {
  /** Stable widget key. */
  readonly key: string;
  /** Initial widget decoration and destroy authority. */
  readonly decoration: Decoration;
  /** Widget mapping association side. */
  readonly side: number;
}
