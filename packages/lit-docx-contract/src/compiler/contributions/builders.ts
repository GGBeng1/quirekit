import type {
  DocxConversionDirection,
  DocxCodecServiceKey,
  DocxFeatureCompiler,
  DocxFieldCapability,
  DocxFieldCapabilityEvidence,
  DocxLossDisposition,
  DocxMarkAttributeCodec,
  DocxMarkCodec,
  DocxModelImportPass,
  DocxNodeCodec,
  DocxPackagePass
} from "./types.js";

/**
 * Defines one stable typed service key for advanced codec context.
 *
 * @param id - Globally stable service identifier.
 * @returns Frozen key carrying the service type at compile time.
 */
export function defineDocxCodecServiceKey<Service>(
  id: string
): DocxCodecServiceKey<Service> {
  if (id.trim().length === 0) {
    throw new TypeError("DOCX codec service keys require a non-empty id.");
  }
  return Object.freeze({ id });
}

/**
 * Creates one immutable field capability declaration.
 *
 * @param field - Stable schema or package field identifier.
 * @param directions - Conversion directions covered by the owner.
 * @param disposition - Declared loss disposition.
 * @param note - Optional implementation or fallback note.
 * @param evidence - Optional diagnostics and preservation policy evidence.
 * @returns Frozen field capability.
 */
export function docxFieldCapability(
  field: string,
  directions: readonly DocxConversionDirection[],
  disposition: DocxLossDisposition,
  note?: string,
  evidence: DocxFieldCapabilityEvidence = {}
): DocxFieldCapability {
  return Object.freeze({
    field,
    directions: Object.freeze([...directions]),
    disposition,
    ...(note === undefined ? {} : { note }),
    ...(evidence.diagnosticCodes === undefined
      ? {}
      : {
          diagnosticCodes: Object.freeze([
            ...evidence.diagnosticCodes
          ])
        }),
    ...(evidence.preservation === undefined
      ? {}
      : {
          preservation: Object.freeze({
            ...evidence.preservation
          })
        })
  });
}

/**
 * Creates one exact model-field capability for schema aggregation.
 *
 * @param kind - Node or mark family.
 * @param name - Exact model type.
 * @param field - Exact model attribute, or `$type`.
 * @param directions - Conversion directions owned by this decision.
 * @param disposition - Declared loss disposition.
 * @param evidence - Optional diagnostics, preservation policy, and note.
 * @returns Frozen exact field capability.
 */
export function docxModelFieldCapability(
  kind: "node" | "mark",
  name: string,
  field: string,
  directions: readonly DocxConversionDirection[],
  disposition: DocxLossDisposition,
  evidence: DocxFieldCapabilityEvidence = {}
): DocxFieldCapability {
  return Object.freeze({
    field: `${kind}:${name}.${field}`,
    modelField: Object.freeze({ kind, name, field }),
    directions: Object.freeze([...directions]),
    disposition,
    ...(evidence.note === undefined ? {} : { note: evidence.note }),
    ...(evidence.diagnosticCodes === undefined
      ? {}
      : {
          diagnosticCodes: Object.freeze([
            ...evidence.diagnosticCodes
          ])
        }),
    ...(evidence.preservation === undefined
      ? {}
      : {
          preservation: Object.freeze({
            ...evidence.preservation
          })
        })
  });
}

/**
 * Defines a typed node codec without changing its runtime shape.
 *
 * @param codec - Node codec declaration.
 * @returns The same declaration with immutable collection fields.
 */
export function defineDocxNodeCodec<ModelNode, ModelMark = unknown>(
  codec: DocxNodeCodec<ModelNode, ModelMark>
): DocxNodeCodec<ModelNode, ModelMark> {
  return freezeContribution(codec);
}

/**
 * Defines a typed mark codec without changing its runtime shape.
 *
 * @param codec - Mark codec declaration.
 * @returns The same declaration with immutable collection fields.
 */
export function defineDocxMarkCodec<ModelMark>(
  codec: DocxMarkCodec<ModelMark>
): DocxMarkCodec<ModelMark> {
  return freezeContribution(codec);
}

/**
 * Defines a typed composable mark-attribute codec.
 *
 * @param codec - Partial mark-attribute declaration.
 * @returns The same declaration with immutable collection fields.
 */
export function defineDocxMarkAttributeCodec<ModelMark>(
  codec: DocxMarkAttributeCodec<ModelMark>
): DocxMarkAttributeCodec<ModelMark> {
  const frozen = freezeContribution(codec);
  return Object.freeze({
    ...frozen,
    ...(frozen.import === undefined
      ? {}
      : {
          import: Object.freeze({
            ...frozen.import,
            litMarkTypes: Object.freeze([...frozen.import.litMarkTypes]),
            modelMarkTypes: Object.freeze([...frozen.import.modelMarkTypes]),
            sourceAttributes: Object.freeze([
              ...frozen.import.sourceAttributes
            ]),
            modelAttributes: Object.freeze([
              ...frozen.import.modelAttributes
            ])
          })
        }),
    ...(frozen.export === undefined
      ? {}
      : {
          export: Object.freeze({
            ...frozen.export,
            modelMarkTypes: Object.freeze([...frozen.export.modelMarkTypes]),
            litMarkTypes: Object.freeze([...frozen.export.litMarkTypes]),
            modelAttributes: Object.freeze([
              ...frozen.export.modelAttributes
            ]),
            targetAttributes: Object.freeze([
              ...frozen.export.targetAttributes
            ])
          })
        })
  });
}

/**
 * Defines an ordered LitAST preparation pass for model import.
 *
 * @param pass - Model-import pass declaration.
 * @returns The same declaration with immutable collection fields.
 */
export function defineDocxModelImportPass(
  pass: DocxModelImportPass
): DocxModelImportPass {
  return freezeContribution(pass);
}

/**
 * Defines a typed document-wide feature compiler.
 *
 * @param compiler - Feature compiler declaration.
 * @returns The same declaration with immutable collection fields.
 */
export function defineDocxFeatureCompiler<ModelDocument>(
  compiler: DocxFeatureCompiler<ModelDocument>
): DocxFeatureCompiler<ModelDocument> {
  return freezeContribution(compiler);
}

/**
 * Defines a typed package-plan pass.
 *
 * @param pass - Package pass declaration.
 * @returns The same declaration with immutable collection fields.
 */
export function defineDocxPackagePass<ModelDocument>(
  pass: DocxPackagePass<ModelDocument>
): DocxPackagePass<ModelDocument> {
  return freezeContribution(pass);
}

/**
 * Freezes the shared array fields of one contribution declaration.
 *
 * @param contribution - Contribution to freeze.
 * @returns Frozen contribution with copied collection fields.
 */
function freezeContribution<Contribution extends {
  readonly fieldCapabilities: readonly DocxFieldCapability[];
  readonly requires?: readonly string[] | undefined;
}>(contribution: Contribution): Contribution {
  return Object.freeze({
    ...contribution,
    fieldCapabilities: Object.freeze([...contribution.fieldCapabilities]),
    ...(contribution.requires === undefined
      ? {}
      : { requires: Object.freeze([...contribution.requires]) })
  });
}
