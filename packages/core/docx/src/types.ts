import type {
  DocxCompiledPackagePlan,
  DocxCompilerDiagnostic,
  DocxCompilerInput,
  DocxCompilerResult,
  DocxContribution,
  DocxContributionEntry,
  DocxContributionRegistry,
  DocxModelAdapter,
  DocxModelConversionDiagnostic,
  DocxModelConversionOptions,
  DocxModelConversionResult,
  DocxPackageSourcePlan,
  LitAstDocumentMetadata,
  LitAstDocumentNode,
  LitAstNode,
  ParseOptions,
  ParseResult,
  ParseWarning
} from "@quirekit/lit-docx-contract";

/** Minimal mark shape supported by the default JSON document adapter. */
export interface DocxJsonMark {
  /** Stable model mark type. */
  readonly type: string;
  /** Optional model mark attributes. */
  readonly attrs?: Readonly<Record<string, unknown>> | undefined;
  /** Additional JSON-safe model fields. */
  readonly [key: string]: unknown;
}

/** Minimal recursive node shape supported by the default JSON adapter. */
export interface DocxJsonNode {
  /** Stable model node type. */
  readonly type?: string | undefined;
  /** Optional model attributes. */
  readonly attrs?: Readonly<Record<string, unknown>> | undefined;
  /** Optional source-order children. */
  readonly content?: readonly DocxJsonNode[] | undefined;
  /** Optional marks applied to this node. */
  readonly marks?: readonly DocxJsonMark[] | undefined;
  /** Optional text payload. */
  readonly text?: string | undefined;
  /** Optional model-neutral document metadata retained by direct Manager round trips. */
  readonly docxMeta?: LitAstDocumentMetadata | undefined;
  /** Additional JSON-safe model fields. */
  readonly [key: string]: unknown;
}

/** Single-or-array contribution value accepted by an extension hook. */
export type DocxManagerContributionValue<
  ModelNode = DocxJsonNode,
  ModelMark = DocxJsonMark,
  ModelDocument = DocxJsonNode
> =
  | DocxContribution<ModelNode, ModelMark, ModelDocument>
  | readonly DocxContribution<ModelNode, ModelMark, ModelDocument>[]
  | null
  | undefined;

/** Model-specialized contribution accepted by one Manager instance. */
export type DocxManagerContribution<
  ModelNode,
  ModelMark,
  ModelDocument
> = DocxContribution<ModelNode, ModelMark, ModelDocument>;

/** Owner-annotated contribution entry accepted by one Manager instance. */
export type DocxManagerContributionEntry<
  ModelNode,
  ModelMark,
  ModelDocument
> = DocxContributionEntry<ModelNode, ModelMark, ModelDocument>;

/**
 * DOCX implementation functions a host supplies, normally by loading `@quirekit/lit-docx`.
 * The Manager only depends on these signatures, so it stays independent of that implementation.
 */
export interface DocxManagerRuntime {
  /** Runs feature compilers over one document and returns the package plan. */
  readonly compileDocxContributions: <ModelNode, ModelMark, ModelDocument>(
    input: DocxCompilerInput<ModelDocument>,
    registry: DocxContributionRegistry<ModelNode, ModelMark, ModelDocument>
  ) => Promise<DocxCompilerResult<ModelNode, ModelMark, ModelDocument>>;
  /** Projects LitAST into the base package graph. */
  readonly createDocxPackagePlan: (ast: LitAstNode) => DocxPackageSourcePlan;
  /** Converts a host model document to LitAST. */
  readonly exportModelDocumentToLitAst: <ModelNode, ModelMark, ModelDocument>(
    source: ModelDocument,
    registry: DocxContributionRegistry<ModelNode, ModelMark, ModelDocument>,
    adapter: DocxModelAdapter<ModelNode, ModelMark, ModelDocument>,
    options?: DocxModelConversionOptions
  ) => DocxModelConversionResult<LitAstDocumentNode>;
  /** Converts LitAST to a host model document. */
  readonly importLitAstDocument: <ModelNode, ModelMark, ModelDocument>(
    source: LitAstNode,
    registry: DocxContributionRegistry<ModelNode, ModelMark, ModelDocument>,
    adapter: DocxModelAdapter<ModelNode, ModelMark, ModelDocument>,
    options?: DocxModelConversionOptions
  ) => DocxModelConversionResult<ModelDocument>;
  /** Writes a package plan over existing DOCX bytes. */
  readonly materializeDocxPackagePlan: (input: Uint8Array, plan: DocxCompiledPackagePlan) => Promise<Uint8Array>;
  /** Writes a package plan as a new DOCX file. */
  readonly materializeNewDocxPackagePlan: (plan: DocxCompiledPackagePlan) => Promise<Uint8Array>;
  /** Parses DOCX bytes into LitAST. */
  readonly parseDocx: (buffer: Uint8Array, options?: ParseOptions) => Promise<ParseResult>;
}

/**
 * Loads the model-neutral DOCX runtime.
 *
 * @returns Runtime functions required by the Manager.
 */
export type DocxManagerRuntimeLoader = () => Promise<DocxManagerRuntime>;

/** Options used to create one instance-owned DOCX Manager. */
export interface DocxManagerOptions<
  ModelNode = DocxJsonNode,
  ModelMark = DocxJsonMark,
  ModelDocument = DocxJsonNode
> {
  /** Immutable extension-owned contribution entries for this Editor instance. */
  readonly entries?: readonly DocxContributionEntry<
    ModelNode,
    ModelMark,
    ModelDocument
  >[] | undefined;
  /** Host model adapter; defaults to the recursive JSON adapter. */
  readonly adapter?: DocxModelAdapter<
    ModelNode,
    ModelMark,
    ModelDocument
  > | undefined;
  /** DOCX implementation for this Manager; defaults to the one registered with `provideDocxRuntime`. */
  readonly loadRuntime?: DocxManagerRuntimeLoader | undefined;
  /** Directional defaults used by LitAST and binary import operations. */
  readonly importDefaults?: DocxManagerImportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  > | undefined;
  /** Directional defaults used by LitAST, compiler, and binary export operations. */
  readonly exportDefaults?: DocxManagerExportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  > | undefined;
  /** Optional instance-owned listener for model and compiler diagnostics. */
  readonly onDiagnostic?: DocxManagerDiagnosticListener | undefined;
}

/** Options for importing one already parsed LitAST document. */
export interface DocxManagerImportLitAstOptions<
  ModelNode,
  ModelMark,
  ModelDocument
> extends DocxModelConversionOptions {
  /** Operation-local host adapter override. */
  readonly adapter?: DocxModelAdapter<
    ModelNode,
    ModelMark,
    ModelDocument
  > | undefined;
}

/** Options for exporting one model document to LitAST. */
export interface DocxManagerExportLitAstOptions<
  ModelNode,
  ModelMark,
  ModelDocument
> extends DocxModelConversionOptions {
  /** Operation-local host adapter override. */
  readonly adapter?: DocxModelAdapter<
    ModelNode,
    ModelMark,
    ModelDocument
  > | undefined;
}

/** Instance defaults shared by direct LitAST and binary import operations. */
export interface DocxManagerImportDefaults<
  ModelNode,
  ModelMark,
  ModelDocument
> extends DocxManagerImportLitAstOptions<
  ModelNode,
  ModelMark,
  ModelDocument
> {
  /** Parser options merged before the built-in preservation defaults. */
  readonly parser?: ParseOptions | undefined;
  /**
   * Optional package-aware LitAST preparation used when an operation has no override.
   *
   * @param document - Parsed LitAST document.
   * @param input - Original DOCX bytes.
   * @returns Prepared LitAST document.
   */
  readonly prepareDocument?: ((
    document: LitAstDocumentNode,
    input: Uint8Array
  ) => LitAstDocumentNode | Promise<LitAstDocumentNode>) | undefined;
}

/** Instance defaults shared by direct LitAST, compiler, and binary export operations. */
export interface DocxManagerExportDefaults<
  ModelNode,
  ModelMark,
  ModelDocument
> extends DocxManagerExportLitAstOptions<
  ModelNode,
  ModelMark,
  ModelDocument
> {
  /** Default model-neutral metadata exposed to document-wide compilers. */
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  /**
   * Optional semantic preparation used when an operation has no override.
   *
   * @param document - LitAST produced by installed codecs.
   * @param source - Original host model document.
   * @returns Prepared LitAST document.
   */
  readonly prepareDocument?: ((
    document: LitAstDocumentNode,
    source: ModelDocument
  ) => LitAstDocumentNode | Promise<LitAstDocumentNode>) | undefined;
  /**
   * Optional source-package finishing step applied before contribution compilation.
   *
   * @param packagePlan - Unresolved base package graph awaiting one central allocation.
   * @param document - Prepared LitAST used for generation.
   * @returns Source package graph for compiler merge and one-shot materialization.
   */
  readonly finalizePackagePlan?: ((
    packagePlan: DocxPackageSourcePlan,
    document: LitAstDocumentNode
  ) => DocxPackageSourcePlan | Promise<DocxPackageSourcePlan>) | undefined;
  /**
   * Legacy bytes-level finishing step.
   *
   * Ordinary {@link DocxManager.serialize} rejects this option because it can reopen a
   * materialized ZIP. Use {@link DocxManager.serializeLegacy} while migrating to
   * `finalizePackagePlan`.
   *
   * @param data - Generated package bytes.
   * @param document - Prepared LitAST used for generation.
   * @returns Finished package bytes.
   * @deprecated Use `finalizePackagePlan`. The temporary `serializeLegacy` migration window ends on 2026-09-23.
   */
  readonly finalizePackage?: ((
    data: Uint8Array,
    document: LitAstDocumentNode
  ) => Uint8Array | Promise<Uint8Array>) | undefined;
}

/** Diagnostic phase owned by one Manager operation. */
export type DocxManagerDiagnosticPhase =
  | "model-import"
  | "model-export"
  | "compiler";

/** Diagnostic emitted by model conversion or document-wide compilation. */
export type DocxManagerDiagnostic =
  | DocxModelConversionDiagnostic
  | DocxCompilerDiagnostic;

/** Instance diagnostic event emitted after one owning phase completes. */
export interface DocxManagerDiagnosticEvent {
  /** Conversion or compiler phase that emitted the diagnostic. */
  readonly phase: DocxManagerDiagnosticPhase;
  /** Original immutable diagnostic from the underlying executor. */
  readonly diagnostic: DocxManagerDiagnostic;
}

/**
 * Receives one instance-owned DOCX diagnostic.
 *
 * @param event - Owning phase and original diagnostic.
 */
export type DocxManagerDiagnosticListener = (
  event: DocxManagerDiagnosticEvent
) => void;

/** Options for parsing DOCX bytes through the ordinary Manager path. */
export interface DocxManagerParseOptions<
  ModelNode,
  ModelMark,
  ModelDocument
> {
  /** Parser options forwarded to `lit-docx`. */
  readonly parser?: ParseOptions | undefined;
  /** Model conversion options and optional adapter override. */
  readonly conversion?: DocxManagerImportLitAstOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  > | undefined;
  /**
   * Optional package-aware LitAST preparation before model conversion.
   *
   * @param document - Parsed LitAST document.
   * @param input - Original DOCX bytes.
   * @returns Prepared LitAST document.
   */
  readonly prepareDocument?: ((
    document: LitAstDocumentNode,
    input: Uint8Array
  ) => LitAstDocumentNode | Promise<LitAstDocumentNode>) | undefined;
}

/** Result of ordinary DOCX byte parsing. */
export interface DocxManagerParseResult<ModelDocument> {
  /** Imported host model document. */
  readonly document: ModelDocument;
  /** Prepared LitAST source retained for advanced preservation authorities. */
  readonly source: LitAstDocumentNode;
  /** Non-fatal package parser warnings. */
  readonly warnings: readonly ParseWarning[];
  /** Model conversion diagnostics in source traversal order. */
  readonly diagnostics: readonly DocxModelConversionDiagnostic[];
}

/** Options for serializing one model document through the ordinary Manager path. */
export interface DocxManagerSerializeOptions<
  ModelNode,
  ModelMark,
  ModelDocument
> {
  /** Optional metadata exposed to document-wide feature compilers. */
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  /** Model conversion options and optional adapter override. */
  readonly conversion?: DocxManagerExportLitAstOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  > | undefined;
  /**
   * Optional semantic preparation before binary generation.
   *
   * @param document - LitAST produced by installed codecs.
   * @param source - Original host model document.
   * @returns Prepared LitAST document.
   */
  readonly prepareDocument?: ((
    document: LitAstDocumentNode,
    source: ModelDocument
  ) => LitAstDocumentNode | Promise<LitAstDocumentNode>) | undefined;
  /**
   * Optional source-package finishing step before compiler merge and one-shot materialization.
   *
   * @param packagePlan - Unresolved base package graph awaiting central allocation.
   * @param document - Prepared LitAST used for generation.
   * @returns Source package graph for compiler merge and one-shot materialization.
   */
  readonly finalizePackagePlan?: ((
    packagePlan: DocxPackageSourcePlan,
    document: LitAstDocumentNode
  ) => DocxPackageSourcePlan | Promise<DocxPackageSourcePlan>) | undefined;
  /**
   * Legacy bytes-level finishing step accepted only by {@link DocxManager.serializeLegacy}.
   *
   * @param data - Generated package bytes.
   * @param document - Prepared LitAST used for generation.
   * @returns Finished package bytes.
   * @deprecated Use `finalizePackagePlan`. This migration hook is scheduled for removal on 2026-09-23.
   */
  readonly finalizePackage?: ((
    data: Uint8Array,
    document: LitAstDocumentNode
  ) => Uint8Array | Promise<Uint8Array>) | undefined;
}

/** Result of ordinary model-document serialization. */
export interface DocxManagerSerializeResult {
  /** Complete generated DOCX package. */
  readonly data: Uint8Array;
  /** Prepared LitAST document used for generation. */
  readonly document: LitAstDocumentNode;
  /** Model conversion diagnostics in source traversal order. */
  readonly diagnostics: readonly DocxModelConversionDiagnostic[];
  /** Document-wide compiler and package validation diagnostics. */
  readonly compilerDiagnostics: readonly DocxCompilerDiagnostic[];
}

/** Generic registry owned by one Manager instance. */
export type AnyDocxContributionRegistry<
  ModelNode,
  ModelMark,
  ModelDocument
> = DocxContributionRegistry<ModelNode, ModelMark, ModelDocument>;

/** Generic compiler result returned by one Manager instance. */
export type AnyDocxCompilerResult<
  ModelNode,
  ModelMark,
  ModelDocument
> = DocxCompilerResult<ModelNode, ModelMark, ModelDocument>;

/** Generic compiler input accepted by one Manager instance. */
export type AnyDocxCompilerInput<ModelDocument> =
  DocxCompilerInput<ModelDocument>;

/** Generic model-conversion result returned by one Manager instance. */
export type AnyDocxModelConversionResult<Value> =
  DocxModelConversionResult<Value>;

/** Centrally allocated package plan accepted by Manager materialization. */
export type AnyDocxCompiledPackagePlan = DocxCompiledPackagePlan;
