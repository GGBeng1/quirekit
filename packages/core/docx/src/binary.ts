import type { LitAstDocumentNode } from "@quirekit/lit-docx-contract";
import type {
  AnyDocxCompilerInput,
  AnyDocxCompilerResult,
  AnyDocxModelConversionResult,
  DocxManagerParseOptions,
  DocxManagerParseResult,
  DocxManagerRuntime,
  DocxManagerSerializeOptions,
  DocxManagerSerializeResult
} from "./types";
import { copyDocxBytes } from "./runtime";

/** Manager operations required by the ordinary binary pipeline. */
export interface DocxManagerBinaryHost<
  ModelNode,
  ModelMark,
  ModelDocument
> {
  /**
   * Loads the runtime bound to the owning Manager.
   *
   * @returns Model-neutral DOCX runtime.
   */
  readonly getRuntime: () => Promise<DocxManagerRuntime>;
  /**
   * Imports prepared LitAST through the owning Manager.
   *
   * @param source - Prepared LitAST document.
   * @param options - Operation-local conversion options.
   * @returns Imported model document and diagnostics.
   */
  readonly importLitAst: (
    source: LitAstDocumentNode,
    options: NonNullable<
      DocxManagerParseOptions<
        ModelNode,
        ModelMark,
        ModelDocument
      >["conversion"]
    > | undefined
  ) => Promise<AnyDocxModelConversionResult<ModelDocument>>;
  /**
   * Exports a model document through the owning Manager.
   *
   * @param source - Host model document.
   * @param options - Operation-local conversion options.
   * @returns LitAST document and diagnostics.
   */
  readonly exportLitAst: (
    source: ModelDocument,
    options: NonNullable<
      DocxManagerSerializeOptions<
        ModelNode,
        ModelMark,
        ModelDocument
      >["conversion"]
    > | undefined
  ) => Promise<AnyDocxModelConversionResult<LitAstDocumentNode>>;
  /**
   * Compiles document-wide contributions.
   *
   * @param input - Model document and compiler metadata.
   * @returns Compiler snapshots and package plan.
   */
  readonly compile: (
    input: AnyDocxCompilerInput<ModelDocument>
  ) => Promise<AnyDocxCompilerResult<ModelNode, ModelMark, ModelDocument>>;
}

/**
 * Parses DOCX bytes through one Manager's ordinary model path.
 *
 * @param host - Operations owned by the Manager instance.
 * @param input - Complete DOCX bytes.
 * @param options - Parser, preparation, and conversion options.
 * @returns Imported document, source LitAST, warnings, and diagnostics.
 */
export async function parseDocxWithManager<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  host: DocxManagerBinaryHost<ModelNode, ModelMark, ModelDocument>,
  input: Uint8Array,
  options: DocxManagerParseOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  >
): Promise<DocxManagerParseResult<ModelDocument>> {
  const runtime = await host.getRuntime();
  const parsed = await runtime.parseDocx(input, {
    numberingMode: "flat-numbered-paragraphs",
    preserveRawXml: true,
    ...options.parser
  });
  const source = options.prepareDocument === undefined
    ? parsed.ast as LitAstDocumentNode
    : await options.prepareDocument(
        parsed.ast as LitAstDocumentNode,
        input
      );
  const converted = await host.importLitAst(source, options.conversion);
  return {
    document: converted.value,
    source,
    warnings: Object.freeze([...parsed.warnings]),
    diagnostics: converted.diagnostics
  };
}

/**
 * Serializes one model document through one Manager's ordinary binary path.
 *
 * @param host - Operations owned by the Manager instance.
 * @param source - Host model document.
 * @param options - Compiler, preparation, and package options.
 * @returns Complete DOCX package and diagnostics.
 */
export async function serializeDocxWithManager<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  host: DocxManagerBinaryHost<ModelNode, ModelMark, ModelDocument>,
  source: ModelDocument,
  options: DocxManagerSerializeOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  >
): Promise<DocxManagerSerializeResult> {
  if (options.finalizePackage !== undefined) {
    throw new TypeError(
      "DocxManager.serialize cannot apply a bytes-level finalizePackage after one-shot materialization. Use finalizePackagePlan or serializeLegacy."
    );
  }
  const [converted, runtime] = await Promise.all([
    host.exportLitAst(source, options.conversion),
    host.getRuntime()
  ]);
  const document = options.prepareDocument === undefined
    ? converted.value
    : await options.prepareDocument(converted.value, source);
  const basePackagePlan = runtime.createDocxPackagePlan(document);
  // Finalize semantic source claims before the compiler allocates every package identity.
  const finalizedPackagePlan = options.finalizePackagePlan === undefined
    ? basePackagePlan
    : await options.finalizePackagePlan(basePackagePlan, document);
  const compiled = await host.compile({
    document: source,
    packagePlan: finalizedPackagePlan,
    ...(options.metadata === undefined
      ? {}
      : { metadata: options.metadata })
  });
  const data = copyDocxBytes(await runtime.materializeNewDocxPackagePlan(
    compiled.packagePlan
  ));
  return {
    data,
    document,
    diagnostics: converted.diagnostics,
    compilerDiagnostics: compiled.finalSnapshot.diagnostics
  };
}

/**
 * Serializes through the ordinary graph pipeline, then invokes an explicit legacy byte adapter.
 *
 * This compatibility path is intentionally separate because a byte-level hook can reopen or
 * replace the emitted ZIP after the graph materializer has completed.
 *
 * @param host - Operations owned by the Manager instance.
 * @param source - Host model document.
 * @param options - Compiler, preparation, typed package, and legacy byte options.
 * @returns Complete DOCX package and diagnostics after the legacy adapter.
 */
export async function serializeDocxWithLegacyFinalizer<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  host: DocxManagerBinaryHost<ModelNode, ModelMark, ModelDocument>,
  source: ModelDocument,
  options: DocxManagerSerializeOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  >
): Promise<DocxManagerSerializeResult> {
  const { finalizePackage, ...ordinaryOptions } = options;
  const result = await serializeDocxWithManager(host, source, ordinaryOptions);
  if (finalizePackage === undefined) return result;
  return {
    ...result,
    data: copyDocxBytes(await finalizePackage(result.data, result.document))
  };
}
