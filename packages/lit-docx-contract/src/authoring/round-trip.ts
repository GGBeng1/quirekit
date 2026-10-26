import type {
  DocxNodeImportSource,
  DocxRoundTripApi,
  DocxTaggedContainerOptions
} from "./types.js";
import type { LitAstNode } from "../core/contracts.js";
import { metadataKey, optionalKey, readRoundTripMetadata, validateMetadata } from "../round-trip/metadata.js";
import { budgetRoundTripMetadata } from "../round-trip/budget.js";

/**
 * Creates tagged round-trip operations.
 *
 * @returns Immutable round-trip builders.
 */
export function createDocxRoundTripApi(): DocxRoundTripApi {
  const api: DocxRoundTripApi = {
    budget: budgetRoundTripMetadata,
    readMetadata: readRoundTripMetadata,
    matchTag: createTagSelector,
    taggedBlock: (options: DocxTaggedContainerOptions) =>
      createTaggedContainer(options, "block"),
    taggedInline: (options: DocxTaggedContainerOptions) =>
      createTaggedContainer(options, "inline")
  };
  return Object.freeze(api);
}

/**
 * Creates an import selector for one extension-defined content-control tag.
 *
 * @param tag - Stable extension-defined tag.
 * @returns Frozen semantic source selector.
 */
function createTagSelector(tag: string): DocxNodeImportSource {
  const normalized = tag.trim();
  if (normalized.length === 0) {
    throw new TypeError("DOCX tagged selectors require a non-empty tag.");
  }
  return Object.freeze({
    nodeType: "sdt",
    matches: (node: LitAstNode) =>
      node.type === "sdt"
      && node.attrs?.tag === normalized
  });
}

/**
 * Creates one rich-text content-control projection.
 *
 * @param options - Tag, alias, and legal fallback content.
 * @param scope - Structural scope used by adapters and diagnostics.
 * @returns Tagged semantic container.
 */
function createTaggedContainer(
  options: DocxTaggedContainerOptions,
  scope: "block" | "inline"
) {
  if (options.tag.trim().length === 0) {
    throw new TypeError("DOCX tagged containers require a non-empty tag.");
  }
  return Object.freeze({
    type: "sdt",
    ...(options.metadata === undefined ? {} : { meta: Object.freeze({ [metadataKey]: validateMetadata(options.metadata), ...(options.metadataOptional ? { [optionalKey]: true } : {}) }) }),
    attrs: Object.freeze({
      sdtType: "richText",
      tag: options.tag,
      scope,
      ...(options.alias === undefined ? {} : { alias: options.alias })
    }),
    children: Object.freeze([...options.children])
  });
}
