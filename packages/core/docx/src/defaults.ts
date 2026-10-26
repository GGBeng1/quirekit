import type {
  DocxManagerExportDefaults,
  DocxManagerImportDefaults
} from "./types";

/**
 * Captures immutable directional import defaults for one Manager.
 *
 * @param defaults - Host-provided defaults.
 * @returns Frozen defaults with a defensively copied parser object.
 */
export function createDocxManagerImportDefaults<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  defaults: DocxManagerImportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  > | undefined
): Readonly<DocxManagerImportDefaults<
  ModelNode,
  ModelMark,
  ModelDocument
>> {
  if (defaults === undefined) return Object.freeze({});
  const { parser, ...conversionAndHooks } = defaults;
  return Object.freeze({
    ...conversionAndHooks,
    ...(parser === undefined
      ? {}
      : { parser: Object.freeze({ ...parser }) })
  });
}

/**
 * Captures immutable directional export defaults for one Manager.
 *
 * @param defaults - Host-provided defaults.
 * @returns Frozen defaults with defensively copied compiler metadata.
 */
export function createDocxManagerExportDefaults<
  ModelNode,
  ModelMark,
  ModelDocument
>(
  defaults: DocxManagerExportDefaults<
    ModelNode,
    ModelMark,
    ModelDocument
  > | undefined
): Readonly<DocxManagerExportDefaults<
  ModelNode,
  ModelMark,
  ModelDocument
>> {
  if (defaults === undefined) return Object.freeze({});
  const { metadata, ...conversionAndHooks } = defaults;
  return Object.freeze({
    ...conversionAndHooks,
    ...(metadata === undefined
      ? {}
      : { metadata: Object.freeze({ ...metadata }) })
  });
}
