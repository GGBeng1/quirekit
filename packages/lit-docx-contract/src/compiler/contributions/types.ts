import type {
  LitAstDocumentNode,
  LitAstMark,
  LitAstNode
} from "../../core/contracts.js";
import type { DocxAuthoringApi } from "../../authoring/types.js";
import type { DocxCompilerPhase } from "../phases/index.js";
import type {
  DocxCompilerDiagnostic,
  DocxCompilerPatch,
  DocxCompilerSnapshot,
  DocxPackageSourcePlan
} from "../products/index.js";

/** Conversion direction supported by one field capability. */
export type DocxConversionDirection = "import" | "export";

/** Loss handling requested by the host conversion lifecycle. */
export type DocxConversionLossPolicy = "strict" | "best-effort";

/** Loss disposition declared for one field and direction. */
export type DocxLossDisposition =
  | "native"
  | "projected"
  | "preserved"
  | "approximated"
  | "unsupported";

/** Exact model field owned by one conversion capability. */
export interface DocxModelFieldIdentity {
  /** Whether the field belongs to a model node or mark. */
  readonly kind: "node" | "mark";
  /** Exact model node or mark type. */
  readonly name: string;
  /** Exact model attribute, or `$type` for structural ownership. */
  readonly field: string;
}

/** Evidence required by lossy or preserved field decisions. */
export interface DocxFieldCapabilityEvidence {
  /** Optional implementation or fallback note. */
  readonly note?: string | undefined;
  /** Stable diagnostic codes emitted for lossy conversion. */
  readonly diagnosticCodes?: readonly string[] | undefined;
  /** Preservation authority and modeled edit that invalidates it. */
  readonly preservation?: {
    /** Imported source that remains authoritative while unedited. */
    readonly authority: string;
    /** Modeled edit that invalidates or regenerates preserved source. */
    readonly invalidation: string;
  } | undefined;
}

/** Field-level conversion capability owned by one contribution. */
export interface DocxFieldCapability {
  /** Stable schema or package field identifier. */
  readonly field: string;
  /** Optional exact model field used for resolved-schema validation. */
  readonly modelField?: DocxModelFieldIdentity | undefined;
  /** Directions covered by this capability. */
  readonly directions: readonly DocxConversionDirection[];
  /** Strongest loss disposition shared by the declared directions. */
  readonly disposition: DocxLossDisposition;
  /** Optional implementation or fallback note. */
  readonly note?: string | undefined;
  /** Stable diagnostic codes emitted for lossy conversion. */
  readonly diagnosticCodes?: readonly string[] | undefined;
  /** Preservation evidence required when disposition is `preserved`. */
  readonly preservation?: DocxFieldCapabilityEvidence["preservation"];
}

/** Fields shared by every DOCX contribution. */
export interface DocxContributionBase {
  /** Discriminant used by the registry and compiler. */
  readonly kind:
    | "node-codec"
    | "mark-codec"
    | "mark-attribute-codec"
    | "model-import-pass"
    | "feature-compiler"
    | "package-pass";
  /** Stable id unique within one installed contribution set. */
  readonly id: string;
  /** Field capabilities owned by this contribution. */
  readonly fieldCapabilities: readonly DocxFieldCapability[];
  /** Contribution ids that must execute before this contribution. */
  readonly requires?: readonly string[] | undefined;
}

/** Diagnostic input accepted from a node or mark codec. */
export interface DocxCodecDiagnosticInput {
  /** Stable machine-readable diagnostic code. */
  readonly code: string;
  /** Human-readable conversion detail. */
  readonly message: string;
  /** Optional exact model field affected by the decision. */
  readonly schemaField?: string | null | undefined;
  /** Optional source-format field affected by the decision. */
  readonly sourceField?: string | undefined;
  /** User-facing diagnostic severity. */
  readonly severity: DocxCompilerDiagnostic["severity"];
  /** Loss disposition caused by the conversion decision. */
  readonly disposition?: DocxLossDisposition | undefined;
}

/** Stable typed key for one host-provided codec service. */
export interface DocxCodecServiceKey<Service> {
  /** Globally stable service identifier used across package boundaries. */
  readonly id: string;
  /** Compile-time-only carrier for the resolved service type. */
  readonly __serviceType?: ((service: Service) => Service) | undefined;
}

/** Resolves optional host authorities needed by advanced local codecs. */
export type DocxCodecServiceResolver = <Service>(
  key: DocxCodecServiceKey<Service>
) => Service | undefined;

/** Context supplied while a node codec imports LitAST. */
export interface DocxNodeImportContext<ModelNode, ModelMark = unknown> {
  /** Claimed source LitAST node. */
  readonly node: LitAstNode;
  /** Structural source path. */
  readonly path: string;
  /** Structural content category required by the current host parent. */
  readonly contentKind: "block" | "inline";
  /** Whether malformed or unsupported input must throw or may degrade. */
  readonly lossPolicy: DocxConversionLossPolicy;
  /** Resolves typed document-level authorities without coupling the generic runtime to a host model. */
  readonly resolveService: DocxCodecServiceResolver;
  /** Semantic authoring facade bound to this conversion lifecycle. */
  readonly docx: DocxAuthoringApi;
  /**
   * Recursively imports child LitAST nodes through the installed registry.
   * Original source objects retain their structural paths when converted in
   * subsets, reordered lists, or through a flattened source wrapper.
   *
   * @param nodes - Child nodes to import.
   * @returns Model nodes in source order.
   */
  readonly convertChildren: (
    nodes: readonly LitAstNode[]
  ) => readonly ModelNode[];
  /**
   * Recursively imports LitAST marks through the installed registry.
   *
   * @param marks - Source marks to import.
   * @returns Model marks in source order.
   */
  readonly convertMarks: (
    marks: readonly LitAstMark[]
  ) => readonly ModelMark[];
  /**
   * Emits one structured non-fatal conversion diagnostic.
   *
   * @param diagnostic - Diagnostic detail.
   */
  readonly report: (diagnostic: DocxCodecDiagnosticInput) => void;
}

/** Context supplied while a node codec exports a model node. */
export interface DocxNodeExportContext<ModelNode, ModelMark = unknown> {
  /** Claimed source model node. */
  readonly node: ModelNode;
  /** Structural model path. */
  readonly path: string;
  /** Whether unsupported model content must throw or may degrade. */
  readonly lossPolicy: DocxConversionLossPolicy;
  /** Resolves typed document-level authorities without coupling the generic runtime to a host model. */
  readonly resolveService: DocxCodecServiceResolver;
  /** Semantic authoring facade bound to this conversion lifecycle. */
  readonly docx: DocxAuthoringApi;
  /**
   * Recursively exports child model nodes through the installed registry.
   *
   * @param nodes - Child nodes to export.
   * @returns LitAST nodes in source order.
   */
  readonly convertChildren: (
    nodes: readonly ModelNode[]
  ) => readonly LitAstNode[];
  /**
   * Recursively exports model marks through the installed registry.
   *
   * @param marks - Model marks to export.
   * @returns LitAST marks in source order.
   */
  readonly convertMarks: (
    marks: readonly ModelMark[]
  ) => readonly LitAstMark[];
  /**
   * Emits one structured non-fatal conversion diagnostic.
   *
   * @param diagnostic - Diagnostic detail.
   */
  readonly report: (diagnostic: DocxCodecDiagnosticInput) => void;
}

/** Import half of one model-neutral node codec. */
export interface DocxNodeImporter<ModelNode, ModelMark = unknown> {
  /** Used only when no matching non-fallback importer owns the candidate. */
  readonly fallback?: boolean | undefined;
  /** Exact LitAST node types claimed by this importer. */
  readonly litNodeTypes: readonly string[];
  /**
   * Optionally narrows a shared LitAST type to one semantic source.
   *
   * @param node - Candidate source node.
   * @returns Whether this importer owns the candidate.
   */
  readonly matches?: ((node: LitAstNode) => boolean) | undefined;
  /** Exact model node types this importer may create. */
  readonly modelNodeTypes: readonly string[];
  /** Optional structural category required when recursively importing children. */
  readonly childContentKind?: "block" | "inline" | undefined;
  /**
   * Imports one claimed LitAST node.
   *
   * @param context - Source node, recursion, path, and diagnostics.
   * @returns Model nodes replacing the source node.
   */
  readonly convert: (
    context: DocxNodeImportContext<ModelNode, ModelMark>
  ) => readonly ModelNode[];
}

/** Export half of one model-neutral node codec. */
export interface DocxNodeExporter<ModelNode, ModelMark = unknown> {
  /** Exact model node types claimed by this exporter. */
  readonly modelNodeTypes: readonly string[];
  /**
   * Exports one claimed model node.
   *
   * @param context - Source node, recursion, path, and diagnostics.
   * @returns LitAST nodes replacing the source node.
   */
  readonly convert: (
    context: DocxNodeExportContext<ModelNode, ModelMark>
  ) => readonly LitAstNode[];
}

/** Bidirectional or explicitly one-way node contribution. */
export interface DocxNodeCodec<ModelNode = unknown, ModelMark = unknown>
  extends DocxContributionBase {
  /** Node codec discriminant. */
  readonly kind: "node-codec";
  /** Optional LitAST-to-model conversion. */
  readonly import?: DocxNodeImporter<ModelNode, ModelMark> | undefined;
  /** Optional model-to-LitAST conversion. */
  readonly export?: DocxNodeExporter<ModelNode, ModelMark> | undefined;
}

/** Context supplied while a mark codec imports LitAST attributes. */
export interface DocxMarkImportContext<ModelMark> {
  /** Claimed source LitAST mark. */
  readonly mark: LitAstMark;
  /** Structural source path. */
  readonly path: string;
  /** Whether malformed or unsupported input must throw or may degrade. */
  readonly lossPolicy: DocxConversionLossPolicy;
  /** Resolves typed document-level authorities needed by advanced mark codecs. */
  readonly resolveService: DocxCodecServiceResolver;
  /** Semantic authoring facade bound to this conversion lifecycle. */
  readonly docx: DocxAuthoringApi;
  /**
   * Composes independently contributed model attributes into built-in output.
   *
   * @param modelMarkType - Exact model mark receiving the attributes.
   * @param source - Complete LitAST attribute record.
   * @param builtIn - Attributes already projected by the structural mark codec.
   * @returns Built-in and extension-owned model attributes.
   */
  readonly composeAttributes: (
    modelMarkType: ModelMark extends { readonly type: infer Type extends string } ? Type : string,
    source: Readonly<Record<string, unknown>>,
    builtIn?: Readonly<Record<string, unknown>>
  ) => Readonly<Record<string, unknown>>;
  /**
   * Emits one structured non-fatal conversion diagnostic.
   *
   * @param diagnostic - Diagnostic detail.
   */
  readonly report: (diagnostic: DocxCodecDiagnosticInput) => void;
}

/** Context supplied while a mark codec exports model attributes. */
export interface DocxMarkExportContext<ModelMark> {
  /** Claimed source model mark. */
  readonly mark: ModelMark;
  /** Structural model path. */
  readonly path: string;
  /** Whether unsupported model content must throw or may degrade. */
  readonly lossPolicy: DocxConversionLossPolicy;
  /** Resolves typed document-level authorities needed by advanced mark codecs. */
  readonly resolveService: DocxCodecServiceResolver;
  /** Semantic authoring facade bound to this conversion lifecycle. */
  readonly docx: DocxAuthoringApi;
  /**
   * Composes independently contributed LitAST attributes into built-in output.
   *
   * @param litMarkType - Exact LitAST mark receiving the attributes.
   * @param source - Complete model attribute record.
   * @param builtIn - Attributes already projected by the structural mark codec.
   * @returns Built-in and extension-owned LitAST attributes.
   */
  readonly composeAttributes: (
    litMarkType: string,
    source: Readonly<Record<string, unknown>>,
    builtIn?: Readonly<Record<string, unknown>>
  ) => Readonly<Record<string, unknown>>;
  /**
   * Emits one structured non-fatal conversion diagnostic.
   *
   * @param diagnostic - Diagnostic detail.
   */
  readonly report: (diagnostic: DocxCodecDiagnosticInput) => void;
}

/** Import half of one model-neutral mark codec. */
export interface DocxMarkImporter<ModelMark> {
  /** Exact LitAST mark types claimed by this importer. */
  readonly litMarkTypes: readonly string[];
  /** Exact model mark types this importer may create. */
  readonly modelMarkTypes: readonly string[];
  /**
   * Imports one claimed LitAST mark.
   *
   * @param context - Source mark, path, model adapter, and diagnostics.
   * @returns Model marks replacing the source mark.
   */
  readonly convert: (
    context: DocxMarkImportContext<ModelMark>
  ) => readonly ModelMark[];
}

/** Export half of one model-neutral mark codec. */
export interface DocxMarkExporter<ModelMark> {
  /** Exact model mark types claimed by this exporter. */
  readonly modelMarkTypes: readonly string[];
  /**
   * Exports one claimed model mark.
   *
   * @param context - Source mark, path, and diagnostics.
   * @returns LitAST marks replacing the source mark.
   */
  readonly convert: (
    context: DocxMarkExportContext<ModelMark>
  ) => readonly LitAstMark[];
}

/** Bidirectional or explicitly one-way mark contribution. */
export interface DocxMarkCodec<ModelMark = unknown>
  extends DocxContributionBase {
  /** Mark codec discriminant. */
  readonly kind: "mark-codec";
  /** Optional LitAST-to-model conversion. */
  readonly import?: DocxMarkImporter<ModelMark> | undefined;
  /** Optional model-to-LitAST conversion. */
  readonly export?: DocxMarkExporter<ModelMark> | undefined;
}

/** Context supplied while one partial codec imports mark attributes. */
export interface DocxMarkAttributeImportContext {
  /** Complete source LitAST mark. */
  readonly mark: LitAstMark;
  /** Complete source LitAST attributes. */
  readonly source: Readonly<Record<string, unknown>>;
  /** Structural source path. */
  readonly path: string;
  /** Whether malformed or unsupported input must throw or may degrade. */
  readonly lossPolicy: DocxConversionLossPolicy;
  /** Resolves typed document-level authorities needed by advanced codecs. */
  readonly resolveService: DocxCodecServiceResolver;
  /** Semantic authoring facade bound to this conversion lifecycle. */
  readonly docx: DocxAuthoringApi;
  /**
   * Emits one structured non-fatal conversion diagnostic.
   *
   * @param diagnostic - Diagnostic detail.
   */
  readonly report: (diagnostic: DocxCodecDiagnosticInput) => void;
}

/** Context supplied while one partial codec exports mark attributes. */
export interface DocxMarkAttributeExportContext<ModelMark> {
  /** Complete source model mark. */
  readonly mark: ModelMark;
  /** Complete source model attributes. */
  readonly source: Readonly<Record<string, unknown>>;
  /** Structural model path. */
  readonly path: string;
  /** Whether malformed or unsupported input must throw or may degrade. */
  readonly lossPolicy: DocxConversionLossPolicy;
  /** Resolves typed document-level authorities needed by advanced codecs. */
  readonly resolveService: DocxCodecServiceResolver;
  /** Semantic authoring facade bound to this conversion lifecycle. */
  readonly docx: DocxAuthoringApi;
  /**
   * Emits one structured non-fatal conversion diagnostic.
   *
   * @param diagnostic - Diagnostic detail.
   */
  readonly report: (diagnostic: DocxCodecDiagnosticInput) => void;
}

/** Import half of one composable mark-attribute codec. */
export interface DocxMarkAttributeImporter {
  /** Exact LitAST mark types whose attributes may be read. */
  readonly litMarkTypes: readonly string[];
  /** Exact model mark types whose attributes may be created. */
  readonly modelMarkTypes: readonly string[];
  /** Exact LitAST attribute names read by this importer. */
  readonly sourceAttributes: readonly string[];
  /** Exact model attribute names returned by this importer. */
  readonly modelAttributes: readonly string[];
  /**
   * Imports one extension-owned attribute fragment.
   *
   * @param context - Complete mark attributes, path, services, and diagnostics.
   * @returns Model attribute fragment limited to `modelAttributes`.
   */
  readonly convert: (
    context: DocxMarkAttributeImportContext
  ) => Readonly<Record<string, unknown>>;
}

/** Export half of one composable mark-attribute codec. */
export interface DocxMarkAttributeExporter<ModelMark> {
  /** Exact model mark types whose attributes may be read. */
  readonly modelMarkTypes: readonly string[];
  /** Exact LitAST mark types whose attributes may be created. */
  readonly litMarkTypes: readonly string[];
  /** Exact model attribute names read by this exporter. */
  readonly modelAttributes: readonly string[];
  /** Exact LitAST attribute names returned by this exporter. */
  readonly targetAttributes: readonly string[];
  /**
   * Exports one extension-owned attribute fragment.
   *
   * @param context - Complete model attributes, path, services, and diagnostics.
   * @returns LitAST attribute fragment limited to `targetAttributes`.
   */
  readonly convert: (
    context: DocxMarkAttributeExportContext<ModelMark>
  ) => Readonly<Record<string, unknown>>;
}

/** Composable ownership of selected attributes on a shared mark. */
export interface DocxMarkAttributeCodec<ModelMark = unknown>
  extends DocxContributionBase {
  /** Mark-attribute codec discriminant. */
  readonly kind: "mark-attribute-codec";
  /** Optional LitAST-to-model attribute conversion. */
  readonly import?: DocxMarkAttributeImporter | undefined;
  /** Optional model-to-LitAST attribute conversion. */
  readonly export?: DocxMarkAttributeExporter<ModelMark> | undefined;
}

/** Immutable context supplied before model node and mark import dispatch. */
export interface DocxModelImportPassContext {
  /** Current canonical LitAST document. */
  readonly document: LitAstDocumentNode;
  /** Whether malformed or unsupported input must throw or may degrade. */
  readonly lossPolicy: DocxConversionLossPolicy;
  /** Resolves typed document-level authorities needed by the pass. */
  readonly resolveService: DocxCodecServiceResolver;
  /** Semantic authoring facade bound to this import lifecycle. */
  readonly docx: DocxAuthoringApi;
  /**
   * Emits one source-positioned non-fatal conversion diagnostic.
   *
   * @param path - Structural path of the transformed source.
   * @param sourceType - Exact source LitAST type.
   * @param diagnostic - Stable projection or loss decision.
   */
  readonly report: (
    path: string,
    sourceType: string,
    diagnostic: DocxCodecDiagnosticInput
  ) => void;
}

/** Ordered LitAST preparation contributed by one model feature. */
export interface DocxModelImportPass extends DocxContributionBase {
  /** Model-import pass discriminant. */
  readonly kind: "model-import-pass";
  /**
   * Prepares one immutable LitAST document before recursive codec dispatch.
   *
   * @param context - Current document, policy, services, facade, and reporter.
   * @returns Prepared LitAST document root.
   */
  readonly transform: (
    context: DocxModelImportPassContext
  ) => LitAstDocumentNode;
}

/** Generic document input supplied to the compiler. */
export interface DocxCompilerInput<ModelDocument> {
  /** Model document being compiled. */
  readonly document: ModelDocument;
  /** Optional model-neutral metadata exposed to feature compilers. */
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  /** Optional base package graph merged before feature contributions run. */
  readonly packagePlan?: DocxPackageSourcePlan | undefined;
  /**
   * Whether a failing contribution that declares `failurePolicy: "skip"` is
   * skipped with an error diagnostic (best-effort) or rethrown (strict, default).
   */
  readonly lossPolicy?: DocxConversionLossPolicy | undefined;
}

/**
 * Behavior of a document-wide contribution that throws under best-effort
 * compilation. `fatal` fails the export; `skip` drops this contribution's
 * patch, which is valid only when the package stays well-formed without it.
 */
export type DocxContributionFailurePolicy = "fatal" | "skip";

/** Immutable context supplied to one document-wide contribution. */
export interface DocxContributionContext<ModelDocument> {
  /** Current fixed compiler phase. */
  readonly phase: DocxCompilerPhase;
  /** Contribution currently executing. */
  readonly contributionId: string;
  /** Generic document and metadata. */
  readonly input: DocxCompilerInput<ModelDocument>;
  /** Products accumulated before this contribution executes. */
  readonly snapshot: DocxCompilerSnapshot;
  /** Semantic authoring facade for document-wide plans and resources. */
  readonly docx: DocxAuthoringApi;
}

/** Document-wide semantic compiler contributed by one feature. */
export interface DocxFeatureCompiler<ModelDocument = unknown>
  extends DocxContributionBase {
  /** Feature compiler discriminant. */
  readonly kind: "feature-compiler";
  /** Fixed compiler phase where this contribution executes. */
  readonly phase: DocxCompilerPhase;
  /** Best-effort failure behavior; defaults to `fatal`. */
  readonly failurePolicy?: DocxContributionFailurePolicy | undefined;
  /**
   * Produces one immutable semantic or package delta.
   *
   * @param context - Current input, phase, owner, and accumulated products.
   * @returns Compiler delta, synchronously or asynchronously.
   */
  readonly compile: (
    context: DocxContributionContext<ModelDocument>
  ) => DocxCompilerPatch | Promise<DocxCompilerPatch>;
}

/** Typed package-plan pass contributed by one feature. */
export interface DocxPackagePass<ModelDocument = unknown>
  extends DocxContributionBase {
  /** Package pass discriminant. */
  readonly kind: "package-pass";
  /** Fixed compiler phase where this contribution executes. */
  readonly phase: "compile" | "finalize" | "validate";
  /** Best-effort failure behavior; defaults to `fatal`. */
  readonly failurePolicy?: DocxContributionFailurePolicy | undefined;
  /**
   * Produces one immutable package-plan delta.
   *
   * @param context - Current input, phase, owner, and accumulated products.
   * @returns Package-plan delta, synchronously or asynchronously.
   */
  readonly run: (
    context: DocxContributionContext<ModelDocument>
  ) => DocxCompilerPatch | Promise<DocxCompilerPatch>;
}

/** Any contribution accepted by the generic registry. */
export type DocxContribution<
  ModelNode = unknown,
  ModelMark = unknown,
  ModelDocument = unknown
> =
  | DocxNodeCodec<ModelNode, ModelMark>
  | DocxMarkCodec<ModelMark>
  | DocxMarkAttributeCodec<ModelMark>
  | DocxModelImportPass
  | DocxFeatureCompiler<ModelDocument>
  | DocxPackagePass<ModelDocument>;

/** Contribution annotated with the feature or extension that owns it. */
export interface DocxContributionEntry<
  ModelNode = unknown,
  ModelMark = unknown,
  ModelDocument = unknown
> {
  /** Stable feature or extension owner id. */
  readonly ownerId: string;
  /** Contribution declared by that owner. */
  readonly contribution: DocxContribution<ModelNode, ModelMark, ModelDocument>;
}

/** Immutable exact-claim registry for one conversion lifecycle. */
export interface DocxContributionRegistry<
  ModelNode = unknown,
  ModelMark = unknown,
  ModelDocument = unknown
> {
  /** Entries in original owner and declaration order. */
  readonly entries: readonly DocxContributionEntry<
    ModelNode,
    ModelMark,
    ModelDocument
  >[];
  /** Entries in validated dependency order. */
  readonly orderedEntries: readonly DocxContributionEntry<
    ModelNode,
    ModelMark,
    ModelDocument
  >[];
  /** Aggregated field capabilities in dependency order. */
  readonly fieldCapabilities: readonly DocxFieldCapability[];
  /**
   * Finds one contribution by stable id.
   *
   * @param id - Contribution id.
   * @returns Owning entry, or undefined.
   */
  readonly getById: (
    id: string
  ) => DocxContributionEntry<ModelNode, ModelMark, ModelDocument> | undefined;
  /**
   * Finds the exact node importer for one LitAST node type.
   *
   * @param nodeType - LitAST node type.
   * @returns Owning node-codec entry, or undefined.
   */
  readonly getNodeImporter: (
    nodeType: string,
    node?: LitAstNode
  ) => DocxContributionEntry<ModelNode, ModelMark, ModelDocument> | undefined;
  /**
   * Finds the exact node exporter for one model node type.
   *
   * @param nodeType - Model node type.
   * @returns Owning node-codec entry, or undefined.
   */
  readonly getNodeExporter: (
    nodeType: string
  ) => DocxContributionEntry<ModelNode, ModelMark, ModelDocument> | undefined;
  /**
   * Finds the exact mark importer for one LitAST mark type.
   *
   * @param markType - LitAST mark type.
   * @returns Owning mark-codec entry, or undefined.
   */
  readonly getMarkImporter: (
    markType: string
  ) => DocxContributionEntry<ModelNode, ModelMark, ModelDocument> | undefined;
  /**
   * Finds the exact mark exporter for one model mark type.
   *
   * @param markType - Model mark type.
   * @returns Owning mark-codec entry, or undefined.
   */
  readonly getMarkExporter: (
    markType: string
  ) => DocxContributionEntry<ModelNode, ModelMark, ModelDocument> | undefined;
  /**
   * Finds ordered partial importers for one shared mark pair.
   *
   * @param litMarkType - Exact source LitAST mark type.
   * @param modelMarkType - Exact target model mark type.
   * @returns Attribute-codec entries in dependency order.
   */
  readonly getMarkAttributeImporters: (
    litMarkType: string,
    modelMarkType: string
  ) => readonly DocxContributionEntry<ModelNode, ModelMark, ModelDocument>[];
  /**
   * Finds ordered partial exporters for one shared mark pair.
   *
   * @param modelMarkType - Exact source model mark type.
   * @param litMarkType - Exact target LitAST mark type.
   * @returns Attribute-codec entries in dependency order.
   */
  readonly getMarkAttributeExporters: (
    modelMarkType: string,
    litMarkType: string
  ) => readonly DocxContributionEntry<ModelNode, ModelMark, ModelDocument>[];
}
