import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type {
  QuireListMarker,
  QuireParagraphModelProfile,
  QuireParagraphStyleContext
} from "../../document-profile/types";
import { quireNeutralDocumentProfile } from "../../document-profile/defaults";
import type { QuireProseMirrorBlockInputOptions } from "./types";

/** Document-wide paragraph authorities shared by every collection over one document. */
interface DocumentParagraphAuthorities {
  /** Generated list markers keyed by paragraph start. */
  readonly markers: ReadonlyMap<number, QuireListMarker>;
  /** Named paragraph-style context. */
  readonly styleContext: QuireParagraphStyleContext;
}

/** Authorities per paragraph model and immutable document. */
const documentParagraphAuthorities = new WeakMap<object, WeakMap<ProseMirrorNode, DocumentParagraphAuthorities>>();

/**
 * Resolves document-wide numbering and named-style authorities before recursive collection.
 *
 * Body, section, Story and note collections of one frame read the same
 * immutable document, so the authorities are resolved once per document.
 *
 * @param options - Caller-supplied block conversion options.
 * @returns Options carrying immutable numbering and named-style authorities.
 */
export function resolveQuireDocumentBlockInputOptions(
  options: QuireProseMirrorBlockInputOptions
): QuireProseMirrorBlockInputOptions {
  const model = options.paragraphModel ?? quireNeutralDocumentProfile.paragraphModel;
  if (options.wordNumberingMarkers !== undefined && options.paragraphStyleContext !== undefined) return options;
  const authorities = readDocumentParagraphAuthorities(model, options.state.doc);
  return {
    ...options,
    wordNumberingMarkers: options.wordNumberingMarkers ?? authorities.markers,
    paragraphStyleContext: options.paragraphStyleContext ?? authorities.styleContext
  };
}

/**
 * Reads the authorities of one immutable document, resolving them on first use.
 *
 * @param model - Paragraph model facet owning the semantics.
 * @param doc - Immutable document being collected.
 * @returns Shared document-wide authorities.
 */
function readDocumentParagraphAuthorities(
  model: QuireParagraphModelProfile,
  doc: ProseMirrorNode
): DocumentParagraphAuthorities {
  let byDocument = documentParagraphAuthorities.get(model);
  if (byDocument === undefined) {
    byDocument = new WeakMap();
    documentParagraphAuthorities.set(model, byDocument);
  }
  let authorities = byDocument.get(doc);
  if (authorities === undefined) {
    authorities = { markers: model.listMarkers(doc), styleContext: model.styleContext(doc) };
    byDocument.set(doc, authorities);
  }
  return authorities;
}

/**
 * Projects provider ownership into the recursive body-collection context.
 *
 * Section providers replace inherited line-grid authority. Table providers
 * retain the section value for preservation but mark their cell content as a
 * compatibility-gated bypass.
 *
 * @param sourceNode - Provider-owning ProseMirror node.
 * @param options - Parent block-input options.
 * @param inlineSize - Provider-requested child inline size.
 * @param childPath - Source path of the child container; table cells end in row and cell index.
 * @returns Nested collection options with exact measurement authority.
 */
export function resolveNestedBlockInputOptions(
  sourceNode: ProseMirrorNode,
  options: QuireProseMirrorBlockInputOptions,
  inlineSize: number,
  childPath: readonly number[]
): QuireProseMirrorBlockInputOptions {
  const lineGrid = options.resolveContainerLineGrid?.(sourceNode);
  const characterGrid = options.resolveContainerCharacterGrid?.(sourceNode);
  const resized = { ...options, width: inlineSize,
    ...(lineGrid === undefined ? {} : { lineGrid }),
    ...(characterGrid === undefined ? {} : { characterGrid }) };
  const tableModel = options.tableModel ?? quireNeutralDocumentProfile.tableModel;
  if (sourceNode.type.name === tableModel.tableNodeType) {
    const layer = tableModel.cellStyleLayer(options.state.doc, sourceNode, childPath);
    // A nested table cell must not inherit the outer cell's table-style layer.
    const { wordTableCellStyleLayer: _outer, ...base } = resized;
    return {
      ...base,
      insideWordTableCell: true,
      ...(layer === undefined ? {} : { wordTableCellStyleLayer: layer })
    };
  }
  return resized;
}
