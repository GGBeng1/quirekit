import { docxModelFieldCapability } from "../../compiler/contributions/index.js";
import type {
  DocxCodecCapabilityOptions,
  DocxCodecDirectionDecision,
  DocxCodecFieldCapabilityOptions,
  DocxMarkAttributeCapabilityOptions
} from "../types.js";

/**
 * Derives model-field capability rows for both installed directions.
 *
 * @param kind - Node or mark family.
 * @param modelType - Exact model type.
 * @param options - Extra fields and loss decisions.
 * @param hasImport - Whether the codec imports.
 * @param hasExport - Whether the codec exports.
 * @returns Complete structural capability list.
 */
export function createDocxCapabilities(
  kind: "node" | "mark",
  modelType: string,
  options: DocxCodecCapabilityOptions | undefined,
  hasImport: boolean,
  hasExport: boolean
) {
  const fields = normalizeCapabilityFields(options);
  return fields.flatMap(({
    field,
    import: importDecision,
    export: exportDecision
  }) => [
    ...(hasImport
      ? [createDocxCapability(
          kind,
          modelType,
          field,
          "import",
          importDecision ?? options?.import
        )]
      : []),
    ...(hasExport
      ? [createDocxCapability(
          kind,
          modelType,
          field,
          "export",
          exportDecision ?? options?.export
        )]
      : [])
  ]);
}

/**
 * Derives directional capabilities without claiming shared mark structure.
 *
 * @param modelType - Exact shared model mark type.
 * @param fields - Extension-owned model attributes.
 * @param options - Directional loss decisions.
 * @param hasImport - Whether the codec imports.
 * @param hasExport - Whether the codec exports.
 * @returns Field capabilities for only the selected attributes.
 */
export function createDocxMarkAttributeCapabilities(
  modelType: string,
  fields: readonly string[],
  options: DocxMarkAttributeCapabilityOptions | undefined,
  hasImport: boolean,
  hasExport: boolean
) {
  return [...new Set(fields)].flatMap((field) => [
    ...(hasImport
      ? [createDocxCapability(
          "mark",
          modelType,
          field,
          "import",
          options?.import
        )]
      : []),
    ...(hasExport
      ? [createDocxCapability(
          "mark",
          modelType,
          field,
          "export",
          options?.export
        )]
      : [])
  ]);
}

/**
 * Creates one directional capability row.
 *
 * @param kind - Node or mark family.
 * @param modelType - Exact model type.
 * @param field - Exact model field.
 * @param direction - Import or export.
 * @param decision - Loss decision, defaulting to native.
 * @returns One immutable capability.
 */
export function createDocxCapability(
  kind: "node" | "mark",
  modelType: string,
  field: string,
  direction: "import" | "export",
  decision: DocxCodecDirectionDecision | undefined
) {
  const disposition = decision?.disposition ?? "native";
  const diagnosticCodes = decision?.diagnosticCodes
    ?? (decision?.diagnostic === undefined
      ? undefined
      : [decision.diagnostic.code]);
  return docxModelFieldCapability(
    kind,
    modelType,
    field,
    [direction],
    disposition,
    {
      ...(decision?.note === undefined ? {} : { note: decision.note }),
      ...(diagnosticCodes === undefined
        ? {}
        : { diagnosticCodes }),
      ...(decision?.preservation === undefined
        ? {}
        : { preservation: decision.preservation })
    }
  );
}

/**
 * Normalizes concise field names and complex per-field decisions.
 *
 * @param options - Codec-wide capability declaration.
 * @returns Deduplicated fields with `$type` first.
 */
function normalizeCapabilityFields(
  options: DocxCodecCapabilityOptions | undefined
): readonly DocxCodecFieldCapabilityOptions[] {
  const fields = new Map<string, DocxCodecFieldCapabilityOptions>();
  fields.set("$type", { field: "$type" });
  for (const value of options?.fields ?? []) {
    const definition = typeof value === "string"
      ? { field: value }
      : value;
    fields.set(definition.field, definition);
  }
  return [...fields.values()];
}
