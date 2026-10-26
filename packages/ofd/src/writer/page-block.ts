import { ofdXmlElement, type OFDXmlElement } from "../xml";
import { compileOFDGraphic } from "./graphics";
import type {
  OFDAssignedDocument,
  OFDAssignedPageBlock,
  OFDAssignedPageBlockChild
} from "./types";

/**
 * Compiles one nested page block and preserves its child paint order.
 *
 * @param block - Assigned nested page block.
 * @param document - Assigned document resource graph.
 * @returns PageBlock XML element.
 */
export function compileOFDPageBlock(
  block: OFDAssignedPageBlock,
  document: OFDAssignedDocument
): OFDXmlElement {
  return ofdXmlElement(
    "ofd:PageBlock",
    { ID: block.id },
    block.children.map((child) => compileOFDPageBlockChild(child, document))
  );
}

/**
 * Compiles one ordered child of a page block or layer.
 *
 * @param child - Assigned graphic or nested page block.
 * @param document - Assigned document resource graph.
 * @returns Graphic or PageBlock XML element.
 */
export function compileOFDPageBlockChild(
  child: OFDAssignedPageBlockChild,
  document: OFDAssignedDocument
): OFDXmlElement {
  return "children" in child
    ? compileOFDPageBlock(child, document)
    : compileOFDGraphic(child, document);
}
