import {
  docxRelationship,
  docxResource
} from "../compiler/builders/index.js";
import type {
  DocxImageOptions,
  DocxRelationshipKind,
  DocxRelationshipOptions,
  DocxResourcesApi
} from "./types.js";

const relationshipTypes: Readonly<Record<DocxRelationshipKind, string>> =
  Object.freeze({
    image:
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
    hyperlink:
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
    styles:
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
    numbering:
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering",
    header:
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header",
    footer:
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer"
  });

/**
 * Creates semantic resource operations.
 *
 * @returns Immutable resource builders.
 */
export function createDocxResourcesApi(): DocxResourcesApi {
  const api: DocxResourcesApi = {
    image: (key: string, options: DocxImageOptions) =>
      docxResource(key, "image", {
      ...(options.mediaType === undefined
        ? {}
        : { mediaType: options.mediaType }),
      ...(options.data === undefined ? {} : { data: options.data }),
      ...(options.src === undefined ? {} : { source: options.src })
    }),
    style: (key: string, styleId: string) => docxResource(key, "style", {
      source: styleId
    }),
    numbering: (key: string, definitionId: string) =>
      docxResource(key, "numbering", {
      source: definitionId
    }),
    relationship: (options: DocxRelationshipOptions) => docxRelationship(
      options.key,
      options.sourcePart ?? "/word/document.xml",
      relationshipTypes[options.kind],
      typeof options.target === "string"
        ? options.target
        : options.target.key,
      options.external === true ? "external" : "internal"
    )
  };
  return Object.freeze(api);
}
