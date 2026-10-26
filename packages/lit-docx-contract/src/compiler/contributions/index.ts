export {
  defineDocxCodecServiceKey,
  defineDocxFeatureCompiler,
  defineDocxMarkAttributeCodec,
  defineDocxMarkCodec,
  defineDocxModelImportPass,
  defineDocxNodeCodec,
  defineDocxPackagePass,
  docxFieldCapability,
  docxModelFieldCapability
} from "./builders.js";
export {
  createDocxContributionRegistry
} from "./registry/index.js";
export {
  DocxContributionRegistrationError
} from "./registration-error.js";
export type {
  DocxContributionRegistrationErrorCode
} from "./registration-error.js";
export type {
  DocxCodecDiagnosticInput,
  DocxCodecServiceKey,
  DocxCodecServiceResolver,
  DocxCompilerInput,
  DocxContribution,
  DocxContributionBase,
  DocxContributionContext,
  DocxContributionEntry,
  DocxContributionRegistry,
  DocxContributionFailurePolicy,
  DocxConversionLossPolicy,
  DocxConversionDirection,
  DocxFeatureCompiler,
  DocxFieldCapability,
  DocxFieldCapabilityEvidence,
  DocxLossDisposition,
  DocxMarkAttributeCodec,
  DocxMarkAttributeExporter,
  DocxMarkAttributeExportContext,
  DocxMarkAttributeImporter,
  DocxMarkAttributeImportContext,
  DocxMarkCodec,
  DocxMarkExportContext,
  DocxMarkExporter,
  DocxMarkImportContext,
  DocxMarkImporter,
  DocxModelImportPass,
  DocxModelImportPassContext,
  DocxModelFieldIdentity,
  DocxNodeCodec,
  DocxNodeExportContext,
  DocxNodeExporter,
  DocxNodeImportContext,
  DocxNodeImporter,
  DocxPackagePass
} from "./types.js";
