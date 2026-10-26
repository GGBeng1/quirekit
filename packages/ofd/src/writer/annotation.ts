import {
  ofdXmlElement,
  renderOFDXmlDocument,
  type OFDXmlElement
} from "../xml";
import { formatOFDBox } from "./format";
import { compileOFDPageBlockChild } from "./page-block";
import type {
  OFDAssignedAnnotation,
  OFDAssignedDocument,
  OFDAssignedPage
} from "./types";

/**
 * Compiles the document-wide page-annotation index.
 *
 * @param document - Assigned document graph.
 * @returns Complete `Annotations.xml` content.
 */
export function createOFDAnnotationsXml(document: OFDAssignedDocument): string {
  return renderOFDXmlDocument(ofdXmlElement("ofd:Annotations", {
    "xmlns:ofd": "http://www.ofdspec.org/2016"
  }, document.pages
    .filter((page) => page.annotations.length > 0)
    .map((page) => ofdXmlElement("ofd:Page", { PageID: page.id }, [
      ofdXmlElement("ofd:FileLoc", {}, [page.annotationDocumentLocation!])
    ]))));
}

/**
 * Compiles one stable page-local annotation file.
 *
 * @param page - Assigned page with page-local annotations.
 * @param document - Assigned document resource graph.
 * @returns Complete `PageAnnot` XML content.
 */
export function createOFDPageAnnotationsXml(
  page: OFDAssignedPage,
  document: OFDAssignedDocument
): string {
  return renderOFDXmlDocument(ofdXmlElement("ofd:PageAnnot", {
    "xmlns:ofd": "http://www.ofdspec.org/2016"
  }, page.annotations.map((annotation) => compileOFDAnnotation(annotation, document))));
}

/**
 * Compiles one typed annotation and its static appearance.
 *
 * @param annotation - Assigned annotation.
 * @param document - Assigned document resource graph.
 * @returns Annotation XML element.
 */
function compileOFDAnnotation(
  annotation: OFDAssignedAnnotation,
  document: OFDAssignedDocument
): OFDXmlElement {
  const { options, appearance } = annotation.source;
  const parameterEntries = Object.entries(options.parameters ?? {});
  return ofdXmlElement("ofd:Annot", {
    ID: annotation.id,
    Type: options.type,
    Creator: options.creator,
    LastModDate: options.lastModDate,
    Subtype: options.subtype,
    Visible: options.visible,
    Print: options.print,
    NoZoom: options.noZoom,
    NoRotate: options.noRotate,
    ReadOnly: options.readOnly
  }, [
    ...optionalText("ofd:Remark", options.remark),
    ...(parameterEntries.length > 0
      ? [ofdXmlElement("ofd:Parameters", {}, parameterEntries.map(([name, value]) =>
          ofdXmlElement("ofd:Parameter", { Name: name }, [value])
        ))]
      : []),
    ofdXmlElement("ofd:Appearance", {
      Boundary: formatOFDBox(appearance.boundary)
    }, annotation.appearance.map((child) =>
      compileOFDPageBlockChild(child, document)
    ))
  ]);
}

/**
 * Produces an optional single-text child element.
 *
 * @param name - Qualified element name.
 * @param value - Optional text value.
 * @returns Empty or singleton text element collection.
 */
function optionalText(name: string, value: string | undefined): OFDXmlElement[] {
  return value === undefined ? [] : [ofdXmlElement(name, {}, [value])];
}
