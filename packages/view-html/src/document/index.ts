export {
  createHtmlDocumentCompositionRuntime
} from "./composition";
export {
  createHtmlRetainedDocumentView,
  HtmlDomMappingGapError,
  htmlDomMappingGapCode
} from "./runtime";
export { createHtmlMutationBoundary } from "./mutations";
export { syncHtmlRetainedDocumentSurfaceStyle } from "./surface-style";
export type {
  CreateHtmlMutationBoundaryOptions,
  HtmlMutationBoundary,
  HtmlMutationDiagnostics,
  HtmlMutationObserver
} from "./mutations";
export type {
  CreateHtmlDocumentCompositionRuntimeOptions,
  CreateHtmlRetainedDocumentViewOptions,
  HtmlDocumentDescriptorCreationResult,
  HtmlDocumentCompositionDiagnostics,
  HtmlDocumentCompositionRuntime,
  HtmlCompositionSyncResult,
  HtmlDocumentUpdateOptions,
  HtmlDomPoint,
  HtmlRetainedDocumentView
} from "./types";
