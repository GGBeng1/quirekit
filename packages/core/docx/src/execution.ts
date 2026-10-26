import type {
  DocxModelAdapter,
  LitAstDocumentNode
} from "@quirekit/lit-docx-contract";
import type {
  AnyDocxCompiledPackagePlan,
  AnyDocxCompilerInput,
  AnyDocxCompilerResult,
  AnyDocxContributionRegistry,
  AnyDocxModelConversionResult,
  DocxManagerExportLitAstOptions,
  DocxManagerImportLitAstOptions,
  DocxManagerRuntime
} from "./types";
import {
  copyDocxBytes,
  isEmptyDocxPackagePlan
} from "./runtime";

/** Manager authorities required by model and compiler execution. */
export interface DocxManagerExecutionHost<
  ModelNode,
  ModelMark,
  ModelDocument
> {
  /** Default model adapter owned by the Manager. */
  readonly adapter: DocxModelAdapter<
    ModelNode,
    ModelMark,
    ModelDocument
  >;
  /**
   * Loads the Manager runtime.
   *
   * @returns Model-neutral runtime.
   */
  readonly getRuntime: () => Promise<DocxManagerRuntime>;
  /**
   * Returns the Manager contribution registry.
   *
   * @returns Instance-owned registry.
   */
  readonly getRegistry: () => Promise<AnyDocxContributionRegistry<
    ModelNode,
    ModelMark,
    ModelDocument
  >>;
  /** Verifies that the owning Manager is still active. */
  readonly assertActive: () => void;
}

/**
 * Imports one LitAST document through a Manager execution host.
 *
 * @param host - Runtime, registry, adapter, and lifecycle authorities.
 * @param source - Canonical LitAST document.
 * @param options - Conversion and optional adapter options.
 * @returns Imported model document and diagnostics.
 */
export async function importLitAstWithManager<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  host: DocxManagerExecutionHost<ModelNode, ModelMark, ModelDocument>,
  source: LitAstDocumentNode,
  options: DocxManagerImportLitAstOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  >
): Promise<AnyDocxModelConversionResult<ModelDocument>> {
  const [runtime, registry] = await Promise.all([
    host.getRuntime(),
    host.getRegistry()
  ]);
  const { adapter = host.adapter, ...conversion } = options;
  const result = runtime.importLitAstDocument(
    source,
    registry,
    adapter,
    conversion
  );
  host.assertActive();
  return result;
}

/**
 * Exports one model document through a Manager execution host.
 *
 * @param host - Runtime, registry, adapter, and lifecycle authorities.
 * @param source - Host model document.
 * @param options - Conversion and optional adapter options.
 * @returns LitAST document and diagnostics.
 */
export async function exportLitAstWithManager<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  host: DocxManagerExecutionHost<ModelNode, ModelMark, ModelDocument>,
  source: ModelDocument,
  options: DocxManagerExportLitAstOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  >
): Promise<AnyDocxModelConversionResult<LitAstDocumentNode>> {
  const [runtime, registry] = await Promise.all([
    host.getRuntime(),
    host.getRegistry()
  ]);
  const { adapter = host.adapter, ...conversion } = options;
  const result = runtime.exportModelDocumentToLitAst(
    source,
    registry,
    adapter,
    conversion
  );
  host.assertActive();
  return result;
}

/**
 * Runs document-wide contributions through a Manager execution host.
 *
 * @param host - Runtime, registry, and lifecycle authorities.
 * @param input - Model document and compiler metadata.
 * @returns Compiler snapshots and allocated package plan.
 */
export async function compileDocxWithManager<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  host: DocxManagerExecutionHost<ModelNode, ModelMark, ModelDocument>,
  input: AnyDocxCompilerInput<ModelDocument>
): Promise<AnyDocxCompilerResult<ModelNode, ModelMark, ModelDocument>> {
  const [runtime, registry] = await Promise.all([
    host.getRuntime(),
    host.getRegistry()
  ]);
  const result = await runtime.compileDocxContributions(input, registry);
  host.assertActive();
  return result;
}

/**
 * Materializes a package plan through a Manager execution host.
 *
 * @param host - Runtime and lifecycle authorities.
 * @param data - Generated DOCX bytes.
 * @param plan - Allocated package plan.
 * @returns Materialized package bytes.
 */
export async function materializeDocxWithManager<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  host: DocxManagerExecutionHost<ModelNode, ModelMark, ModelDocument>,
  data: Uint8Array,
  plan: AnyDocxCompiledPackagePlan
): Promise<Uint8Array> {
  host.assertActive();
  if (isEmptyDocxPackagePlan(plan)) return copyDocxBytes(data);
  const runtime = await host.getRuntime();
  const materialized = await runtime.materializeDocxPackagePlan(data, plan);
  host.assertActive();
  return copyDocxBytes(materialized);
}

/**
 * Materializes one complete resolved package graph into a new ZIP.
 *
 * @param host - Runtime and lifecycle authorities.
 * @param plan - Complete allocated package graph.
 * @returns Browser-safe DOCX bytes written once.
 */
export async function materializeNewDocxWithManager<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  host: DocxManagerExecutionHost<ModelNode, ModelMark, ModelDocument>,
  plan: AnyDocxCompiledPackagePlan
): Promise<Uint8Array> {
  host.assertActive();
  const runtime = await host.getRuntime();
  const materialized = await runtime.materializeNewDocxPackagePlan(plan);
  host.assertActive();
  return copyDocxBytes(materialized);
}
