import type { DocxModelAdapter } from "@quirekit/lit-docx-contract";
import type {
  DocxJsonMark,
  DocxJsonNode
} from "./types";

/**
 * Creates the default recursive JSON document adapter.
 *
 * Direct Manager round trips retain LitAST document metadata in `docxMeta`.
 * Editor schemas that need editable or transaction-stable metadata should
 * install a schema-owned adapter instead.
 *
 * @returns Model-neutral JSON adapter.
 */
export function createDocxJsonModelAdapter(): DocxModelAdapter<
  DocxJsonNode,
  DocxJsonMark,
  DocxJsonNode
> {
  return {
    getNodeType: (node) => node.type ?? "unknown",
    getMarkType: (mark) => mark.type,
    getDocumentChildren: (document) => document.content ?? [],
    createDocument: (children, source) => ({
      type: "doc",
      content: [...children],
      ...(source.meta === undefined ? {} : { docxMeta: source.meta })
    }),
    getDocumentMetadata: (document) => document.docxMeta
  };
}
