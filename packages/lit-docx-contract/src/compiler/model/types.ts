import type {
  LitAstDocumentMetadata,
  LitAstDocumentNode,
  LitAstNode
} from "../../core/contracts.js";
import type {
  DocxCodecDiagnosticInput,
  DocxCodecServiceResolver,
  DocxConversionDirection,
  DocxConversionLossPolicy,
  DocxLossDisposition
} from "../contributions/index.js";
import type { DocxCompilerDiagnostic } from "../products/index.js";

/** Structural content category expected by one recursive model position. */
export type DocxModelContentKind = "block" | "inline";

/** Root-level LitAST import context delegated to one host model adapter. */
export interface DocxModelImportDocumentContext<ModelNode> {
  /** Complete source LitAST document. */
  readonly source: LitAstDocumentNode;
  /**
   * Recursively imports one source sequence through the generic registry.
   *
   * @param nodes - Source LitAST nodes.
   * @param path - Stable source path for diagnostics.
   * @param contentKind - Structural category expected by the host parent.
   * @returns Imported model nodes in source order.
   */
  readonly convertNodes: (
    nodes: readonly LitAstNode[],
    path: string,
    contentKind?: DocxModelContentKind
  ) => readonly ModelNode[];
}

/** Root-level model export context delegated to one host model adapter. */
export interface DocxModelExportDocumentContext<ModelNode, ModelDocument> {
  /** Complete source host document. */
  readonly source: ModelDocument;
  /**
   * Recursively exports one model sequence through the generic registry.
   *
   * @param nodes - Source model nodes.
   * @param path - Stable model path for diagnostics.
   * @param contentKind - Structural category owned by the host parent.
   * @returns Exported LitAST nodes in source order.
   */
  readonly convertNodes: (
    nodes: readonly ModelNode[],
    path: string,
    contentKind?: DocxModelContentKind
  ) => readonly LitAstNode[];
}

/** Host-owned recovery context for one unsupported imported LitAST node. */
export interface DocxUnsupportedImportNodeContext<ModelNode> {
  /** Unsupported source LitAST node. */
  readonly node: LitAstNode;
  /** Stable structural source path. */
  readonly path: string;
  /** Structural category required by the host parent. */
  readonly contentKind: DocxModelContentKind;
  /** Active strict or best-effort conversion policy. */
  readonly lossPolicy: DocxConversionLossPolicy;
  /**
   * Recursively imports descendants through the generic registry.
   *
   * @param nodes - Source descendants.
   * @param contentKind - Optional descendant category override.
   * @returns Imported model nodes in source order.
   */
  readonly convertChildren: (
    nodes: readonly LitAstNode[],
    contentKind?: DocxModelContentKind
  ) => readonly ModelNode[];
  /**
   * Emits one host fallback diagnostic at the current node path.
   *
   * @param diagnostic - Stable host recovery decision.
   */
  readonly report: (diagnostic: DocxCodecDiagnosticInput) => void;
}

/** Host-owned recovery context for one model node that could not be exported. */
export interface DocxUnsupportedExportNodeContext<ModelNode> {
  /** Model node without an exporter, or whose exporter failed. */
  readonly node: ModelNode;
  /** Stable structural model path. */
  readonly path: string;
  /** Structural category required by the LitAST parent. */
  readonly contentKind: DocxModelContentKind;
  /** Active strict or best-effort conversion policy. */
  readonly lossPolicy: DocxConversionLossPolicy;
  /**
   * Emits one host fallback diagnostic at the current node path.
   *
   * @param diagnostic - Stable host recovery decision.
   */
  readonly report: (diagnostic: DocxCodecDiagnosticInput) => void;
}

/** Host-owned filter context evaluated before node-codec dispatch. */
export interface DocxImportNodeFilterContext {
  /** Candidate source node. */
  readonly node: LitAstNode;
  /** Stable structural source path. */
  readonly path: string;
  /** Structural category required by the current host parent. */
  readonly contentKind: DocxModelContentKind;
}

/** Host-owned normalization context evaluated after one imported sequence. */
export interface DocxImportSequenceContext<ModelNode> {
  /** Original source sequence in source order. */
  readonly source: readonly LitAstNode[];
  /** Converted model sequence before host schema normalization. */
  readonly converted: readonly ModelNode[];
  /** Stable parent path shared by the sequence. */
  readonly path: string;
  /** Structural category required by the current host parent. */
  readonly contentKind: DocxModelContentKind;
}

/** Host-owned accessors that keep generic conversion independent of one editor model. */
export interface DocxModelAdapter<ModelNode, ModelMark, ModelDocument> {
  /**
   * Reads the exact type of one model node.
   *
   * @param node - Model node being dispatched.
   * @returns Stable node type claimed by a node codec.
   */
  readonly getNodeType: (node: ModelNode) => string;
  /**
   * Reads the exact type of one model mark.
   *
   * @param mark - Model mark being dispatched.
   * @returns Stable mark type claimed by a mark codec.
   */
  readonly getMarkType: (mark: ModelMark) => string;
  /**
   * Reads source-order children from one model document.
   *
   * @param document - Host model document.
   * @returns Top-level model nodes.
   */
  readonly getDocumentChildren: (
    document: ModelDocument
  ) => readonly ModelNode[];
  /**
   * Creates one model document after recursive LitAST import.
   *
   * @param children - Imported top-level model nodes.
   * @param source - Complete source LitAST document and metadata.
   * @returns Host model document.
   */
  readonly createDocument: (
    children: readonly ModelNode[],
    source: LitAstDocumentNode
  ) => ModelDocument;
  /**
   * Optionally orchestrates a non-flat document root while delegating every
   * node sequence back to the generic registry.
   *
   * @param context - Source root and generic recursive converter.
   * @returns Complete host model document.
   */
  readonly importDocument?: ((
    context: DocxModelImportDocumentContext<ModelNode>
  ) => ModelDocument) | undefined;
  /**
   * Optionally orchestrates a non-flat host root while delegating every
   * model sequence back to the generic registry.
   *
   * @param context - Host root and generic recursive converter.
   * @returns Complete LitAST document.
   */
  readonly exportDocument?: ((
    context: DocxModelExportDocumentContext<ModelNode, ModelDocument>
  ) => LitAstDocumentNode) | undefined;
  /**
   * Optionally recovers an unsupported source node according to host schema.
   *
   * @param context - Source node, content category, recursion, and reporting.
   * @returns Replacement model nodes.
   */
  readonly handleUnsupportedImportNode?: ((
    context: DocxUnsupportedImportNodeContext<ModelNode>
  ) => readonly ModelNode[]) | undefined;
  /**
   * Optionally replaces a model node that has no exporter or whose exporter
   * failed under best-effort conversion.
   *
   * @param context - Model node, content category, and reporting.
   * @returns Replacement LitAST nodes valid for the content category.
   */
  readonly handleUnsupportedExportNode?: ((
    context: DocxUnsupportedExportNodeContext<ModelNode>
  ) => readonly LitAstNode[]) | undefined;
  /**
   * Optionally reads the structural category of one model node's children so
   * export recovery knows whether it replaces block or inline content.
   *
   * @param node - Parent model node.
   * @returns Child content category, or undefined to inherit the parent's.
   */
  readonly getExportChildContentKind?: ((
    node: ModelNode
  ) => DocxModelContentKind | undefined) | undefined;
  /**
   * Optionally ignores producer metadata before ordinary codec dispatch.
   *
   * @param context - Candidate node, path, and host content category.
   * @returns Whether the source node participates in model conversion.
   */
  readonly shouldImportNode?: ((
    context: DocxImportNodeFilterContext
  ) => boolean) | undefined;
  /**
   * Optionally normalizes one converted sequence for host schema placement.
   *
   * @param context - Source and converted sequences plus structural scope.
   * @returns Schema-compatible model sequence.
   */
  readonly normalizeImportedNodes?: ((
    context: DocxImportSequenceContext<ModelNode>
  ) => readonly ModelNode[]) | undefined;
  /**
   * Reads optional document metadata to retain on exported LitAST.
   *
   * @param document - Host model document.
   * @returns Model-neutral document metadata, or undefined.
   */
  readonly getDocumentMetadata?: (
    document: ModelDocument
  ) => LitAstDocumentMetadata | undefined;
}

/** Options shared by generic model import and export. */
export interface DocxModelConversionOptions {
  /** Whether unsupported content throws or produces explicit diagnostics. */
  readonly lossPolicy?: DocxConversionLossPolicy | undefined;
  /** Optional typed document-level authorities available to installed codecs. */
  readonly resolveService?: DocxCodecServiceResolver | undefined;
}

/** One normalized diagnostic emitted by the generic recursive executor. */
export interface DocxModelConversionDiagnostic {
  /** Stable machine-readable diagnostic code. */
  readonly code: string;
  /** Human-readable conversion detail. */
  readonly message: string;
  /** Import or export lifecycle that made the decision. */
  readonly direction: DocxConversionDirection;
  /** Structural source path. */
  readonly path: string;
  /** Exact source model or LitAST type. */
  readonly sourceType: string;
  /** Optional exact model field affected by the decision. */
  readonly schemaField?: string | null | undefined;
  /** Optional source-format field affected by the decision. */
  readonly sourceField?: string | undefined;
  /** Owning extension or feature id, when a codec emitted the diagnostic. */
  readonly ownerId?: string | undefined;
  /** Owning codec id, when a codec emitted the diagnostic. */
  readonly contributionId?: string | undefined;
  /** User-facing importance. */
  readonly severity: DocxCompilerDiagnostic["severity"];
  /** Resulting loss disposition. */
  readonly disposition: DocxLossDisposition;
}

/** Value and ordered diagnostics returned by one generic conversion. */
export interface DocxModelConversionResult<Value> {
  /** Converted model or LitAST document. */
  readonly value: Value;
  /** Diagnostics in deterministic source traversal order. */
  readonly diagnostics: readonly DocxModelConversionDiagnostic[];
}
