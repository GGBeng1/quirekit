import type {
  AnyDocxCompilerInput,
  DocxManagerExportDefaults,
  DocxManagerExportLitAstOptions,
  DocxManagerImportDefaults,
  DocxManagerImportLitAstOptions,
  DocxManagerParseOptions,
  DocxManagerSerializeOptions
} from "./types";

/**
 * Merges direct import options over instance import defaults.
 *
 * @param defaults - Frozen instance defaults.
 * @param options - Operation-local conversion options.
 * @returns Frozen effective conversion options.
 */
export function mergeDocxManagerImportOptions<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  defaults: Readonly<DocxManagerImportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  >>,
  options: DocxManagerImportLitAstOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  >
): DocxManagerImportLitAstOptions<ModelNode, ModelMark, ModelDocument> {
  const {
    parser: _parser,
    prepareDocument: _prepareDocument,
    ...conversion
  } = defaults;
  return Object.freeze({
    ...conversion,
    ...options
  });
}

/**
 * Merges direct export options over instance export defaults.
 *
 * @param defaults - Frozen instance defaults.
 * @param options - Operation-local conversion options.
 * @returns Frozen effective conversion options.
 */
export function mergeDocxManagerExportOptions<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  defaults: Readonly<DocxManagerExportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  >>,
  options: DocxManagerExportLitAstOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  >
): DocxManagerExportLitAstOptions<ModelNode, ModelMark, ModelDocument> {
  const {
    metadata: _metadata,
    prepareDocument: _prepareDocument,
    finalizePackagePlan: _finalizePackagePlan,
    finalizePackage: _finalizePackage,
    ...conversion
  } = defaults;
  return Object.freeze({
    ...conversion,
    ...options
  });
}

/**
 * Merges binary parse options over instance import defaults.
 *
 * @param defaults - Frozen instance import defaults.
 * @param options - Operation-local parse options.
 * @returns Effective parse options without mutating either source.
 */
export function mergeDocxManagerParseOptions<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  defaults: Readonly<DocxManagerImportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  >>,
  options: DocxManagerParseOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  >
): DocxManagerParseOptions<ModelNode, ModelMark, ModelDocument> {
  const parser = defaults.parser === undefined && options.parser === undefined
    ? undefined
    : Object.freeze({
        ...defaults.parser,
        ...options.parser
      });
  const prepareDocument =
    options.prepareDocument ?? defaults.prepareDocument;
  return Object.freeze({
    ...(parser === undefined ? {} : { parser }),
    ...(options.conversion === undefined
      ? {}
      : { conversion: options.conversion }),
    ...(prepareDocument === undefined ? {} : { prepareDocument })
  });
}

/**
 * Merges binary serialization options over instance export defaults.
 *
 * @param defaults - Frozen instance export defaults.
 * @param options - Operation-local serialization options.
 * @returns Effective serialization options without mutating either source.
 */
export function mergeDocxManagerSerializeOptions<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  defaults: Readonly<DocxManagerExportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  >>,
  options: DocxManagerSerializeOptions<
    ModelNode,
    ModelMark,
    ModelDocument
  >
): DocxManagerSerializeOptions<ModelNode, ModelMark, ModelDocument> {
  const metadata = mergeDocxMetadata(defaults.metadata, options.metadata);
  const prepareDocument =
    options.prepareDocument ?? defaults.prepareDocument;
  const finalizePackagePlan =
    options.finalizePackagePlan ?? defaults.finalizePackagePlan;
  const finalizePackage =
    options.finalizePackage ?? defaults.finalizePackage;
  return Object.freeze({
    ...(metadata === undefined ? {} : { metadata }),
    ...(options.conversion === undefined
      ? {}
      : { conversion: options.conversion }),
    ...(prepareDocument === undefined ? {} : { prepareDocument }),
    ...(finalizePackagePlan === undefined ? {} : { finalizePackagePlan }),
    ...(finalizePackage === undefined ? {} : { finalizePackage })
  });
}

/**
 * Merges compiler input metadata over instance export defaults.
 *
 * @param defaults - Frozen instance export defaults.
 * @param input - Operation-local compiler input.
 * @returns Compiler input with shallowly merged metadata.
 */
export function mergeDocxManagerCompilerInput<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  defaults: Readonly<DocxManagerExportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  >>,
  input: AnyDocxCompilerInput<ModelDocument>
): AnyDocxCompilerInput<ModelDocument> {
  const metadata = mergeDocxMetadata(defaults.metadata, input.metadata);
  return Object.freeze({
    document: input.document,
    ...(metadata === undefined ? {} : { metadata }),
    ...(input.packagePlan === undefined
      ? {}
      : { packagePlan: input.packagePlan }),
    ...(input.lossPolicy === undefined
      ? {}
      : { lossPolicy: input.lossPolicy })
  });
}

/**
 * Shallowly merges model-neutral metadata with operation-local precedence.
 *
 * @param defaults - Instance metadata.
 * @param options - Operation-local metadata.
 * @returns Frozen merged metadata, or undefined when both inputs are absent.
 */
function mergeDocxMetadata(
  defaults: Readonly<Record<string, unknown>> | undefined,
  options: Readonly<Record<string, unknown>> | undefined
): Readonly<Record<string, unknown>> | undefined {
  if (defaults === undefined && options === undefined) return undefined;
  return Object.freeze({
    ...defaults,
    ...options
  });
}
