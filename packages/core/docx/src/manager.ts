import type {
  DocxContributionEntry,
  LitAstDocumentNode
} from "@quirekit/lit-docx-contract";
import {
  parseDocxWithManager,
  serializeDocxWithLegacyFinalizer,
  serializeDocxWithManager
} from "./binary";
import {
  compileDocxWithManager,
  exportLitAstWithManager,
  importLitAstWithManager,
  materializeDocxWithManager,
  materializeNewDocxWithManager
} from "./execution";
import {
  mergeDocxManagerCompilerInput,
  mergeDocxManagerExportOptions,
  mergeDocxManagerImportOptions,
  mergeDocxManagerParseOptions,
  mergeDocxManagerSerializeOptions
} from "./options";
import { DocxManagerState } from "./state";
import type {
  AnyDocxCompiledPackagePlan,
  AnyDocxCompilerInput,
  AnyDocxCompilerResult,
  AnyDocxContributionRegistry,
  AnyDocxModelConversionResult,
  DocxJsonMark,
  DocxJsonNode,
  DocxManagerExportLitAstOptions,
  DocxManagerImportLitAstOptions,
  DocxManagerOptions,
  DocxManagerParseOptions,
  DocxManagerParseResult,
  DocxManagerSerializeOptions,
  DocxManagerSerializeResult
} from "./types";

/** Coordinates extension-owned DOCX conversion for one Editor instance. */
export class DocxManager<
  ModelNode = DocxJsonNode,
  ModelMark = DocxJsonMark,
  ModelDocument = DocxJsonNode
> {
  /** Immutable contribution entries captured from the owning Editor. */
  readonly entries: readonly DocxContributionEntry<
    ModelNode,
    ModelMark,
    ModelDocument
  >[];

  private readonly state: DocxManagerState<
    ModelNode,
    ModelMark,
    ModelDocument
  >;

  /**
   * Creates an instance-owned DOCX Manager.
   *
   * @param options - Contributions, model adapter, and optional runtime loader.
   */
  constructor(
    options: DocxManagerOptions<ModelNode, ModelMark, ModelDocument> = {}
  ) {
    this.state = new DocxManagerState(options);
    this.entries = this.state.entries;
  }

  /**
   * Returns the lazily compiled contribution registry for this instance.
   *
   * @returns Immutable contribution registry.
   */
  async getRegistry(): Promise<AnyDocxContributionRegistry<
    ModelNode,
    ModelMark,
    ModelDocument
  >> {
    return this.state.getRegistry();
  }

  /**
   * Loads the DOCX runtime and compiles the registry before the first operation.
   *
   * The runtime is loaded on demand; hosts that expect to import or export DOCX
   * call this when idle so the first operation does not wait for it.
   *
   * @returns Resolves once the runtime and registry are ready.
   */
  async preload(): Promise<void> {
    await Promise.all([this.state.getRuntime(), this.state.getRegistry()]);
  }

  /**
   * Imports one already parsed LitAST document.
   *
   * @param source - Canonical LitAST document root.
   * @param options - Loss policy, services, and optional adapter override.
   * @returns Imported model document and deterministic diagnostics.
   */
  async importLitAst(
    source: LitAstDocumentNode,
    options: DocxManagerImportLitAstOptions<
      ModelNode,
      ModelMark,
      ModelDocument
    > = {}
  ): Promise<AnyDocxModelConversionResult<ModelDocument>> {
    const result = await importLitAstWithManager(
      this.state.createExecutionHost(),
      source,
      mergeDocxManagerImportOptions(this.state.importDefaults, options)
    );
    this.state.reportDiagnostics("model-import", result.diagnostics);
    return result;
  }

  /**
   * Exports one model document to canonical LitAST.
   *
   * @param source - Host model document.
   * @param options - Loss policy, services, and optional adapter override.
   * @returns LitAST document and deterministic diagnostics.
   */
  async exportLitAst(
    source: ModelDocument,
    options: DocxManagerExportLitAstOptions<
      ModelNode,
      ModelMark,
      ModelDocument
    > = {}
  ): Promise<AnyDocxModelConversionResult<LitAstDocumentNode>> {
    const result = await exportLitAstWithManager(
      this.state.createExecutionHost(),
      source,
      mergeDocxManagerExportOptions(this.state.exportDefaults, options)
    );
    this.state.reportDiagnostics("model-export", result.diagnostics);
    return result;
  }

  /**
   * Runs document-wide feature compilers and package passes.
   *
   * @param input - Model document and optional model-neutral metadata.
   * @returns Fixed compiler snapshots and allocated package plan.
   */
  async compile(
    input: AnyDocxCompilerInput<ModelDocument>
  ): Promise<AnyDocxCompilerResult<ModelNode, ModelMark, ModelDocument>> {
    const result = await compileDocxWithManager(
      this.state.createExecutionHost(),
      mergeDocxManagerCompilerInput(this.state.exportDefaults, input)
    );
    this.state.reportDiagnostics(
      "compiler",
      result.finalSnapshot.diagnostics
    );
    return result;
  }

  /**
   * Materializes an allocated package plan into generated DOCX bytes.
   *
   * @param data - Generated DOCX package.
   * @param plan - Allocated and validated package plan.
   * @returns Package bytes containing planned resources, relationships, and parts.
   */
  async materializePackage(
    data: Uint8Array,
    plan: AnyDocxCompiledPackagePlan
  ): Promise<Uint8Array> {
    return materializeDocxWithManager(
      this.state.createExecutionHost(),
      data,
      plan
    );
  }

  /**
   * Materializes one complete resolved package graph into a new ZIP.
   *
   * @param plan - Complete allocated package graph.
   * @returns Package bytes written by the single graph materializer.
   */
  async materializePackagePlan(
    plan: AnyDocxCompiledPackagePlan
  ): Promise<Uint8Array> {
    return materializeNewDocxWithManager(
      this.state.createExecutionHost(),
      plan
    );
  }

  /**
   * Parses DOCX bytes through the ordinary model conversion path.
   *
   * @param input - Complete DOCX package bytes.
   * @param options - Parser, preparation, and model conversion options.
   * @returns Imported model document, retained LitAST, warnings, and diagnostics.
   */
  async parse(
    input: Uint8Array,
    options: DocxManagerParseOptions<
      ModelNode,
      ModelMark,
      ModelDocument
    > = {}
  ): Promise<DocxManagerParseResult<ModelDocument>> {
    return parseDocxWithManager({
      getRuntime: () => this.state.getRuntime(),
      importLitAst: (source, conversion) =>
        this.importLitAst(source, conversion),
      exportLitAst: (source, conversion) =>
        this.exportLitAst(source, conversion),
      compile: (compilerInput) => this.compile(compilerInput)
    }, input, mergeDocxManagerParseOptions(
      this.state.importDefaults,
      options
    ));
  }

  /**
   * Serializes one model document through the ordinary binary path.
   *
   * @param source - Host model document.
   * @param options - Compiler metadata, preparation, and package finishing options.
   * @returns Complete DOCX package and conversion diagnostics.
   */
  async serialize(
    source: ModelDocument,
    options: DocxManagerSerializeOptions<
      ModelNode,
      ModelMark,
      ModelDocument
    > = {}
  ): Promise<DocxManagerSerializeResult> {
    return serializeDocxWithManager({
      getRuntime: () => this.state.getRuntime(),
      importLitAst: (document, conversion) =>
        this.importLitAst(document, conversion),
      exportLitAst: (document, conversion) =>
        this.exportLitAst(document, conversion),
      compile: (compilerInput) => this.compile(compilerInput)
    }, source, mergeDocxManagerSerializeOptions(
      this.state.exportDefaults,
      options
    ));
  }

  /**
   * Serializes through the graph pipeline and then applies an explicit legacy byte adapter.
   *
   * New integrations must prefer `serialize` with `finalizePackagePlan`; this method exists so
   * a bytes-level adapter cannot silently re-enter the ordinary one-shot package path. The
   * compatibility window is frozen to existing external bytes hooks and ends on 2026-09-23.
   *
   * @param source - Host model document.
   * @param options - Compiler metadata, preparation, typed package, and legacy byte options.
   * @returns Complete DOCX package and conversion diagnostics.
   * @deprecated Migrate to `serialize` with `finalizePackagePlan` before 2026-09-23.
   */
  async serializeLegacy(
    source: ModelDocument,
    options: DocxManagerSerializeOptions<
      ModelNode,
      ModelMark,
      ModelDocument
    > = {}
  ): Promise<DocxManagerSerializeResult> {
    return serializeDocxWithLegacyFinalizer({
      getRuntime: () => this.state.getRuntime(),
      importLitAst: (document, conversion) =>
        this.importLitAst(document, conversion),
      exportLitAst: (document, conversion) =>
        this.exportLitAst(document, conversion),
      compile: (compilerInput) => this.compile(compilerInput)
    }, source, mergeDocxManagerSerializeOptions(
      this.state.exportDefaults,
      options
    ));
  }

  /** Destroys this Manager and rejects later operations. */
  destroy(): void {
    this.state.destroy();
  }
}
