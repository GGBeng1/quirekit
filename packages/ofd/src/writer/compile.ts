import { createOFDArchive } from "../package";
import type { OFDDocumentSnapshot } from "../document/state";
import { assignOFDDocument } from "./assign";
import {
  createOFDDocumentXml,
  createOFDEntryXml
} from "./document";
import {
  createOFDAnnotationsXml,
  createOFDPageAnnotationsXml
} from "./annotation";
import { createOFDPageXml } from "./page";
import { createOFDPageResourcesXml } from "./page-resources";
import {
  createOFDAttachmentsXml,
  createOFDDocumentResourcesXml,
  createOFDPublicResourcesXml
} from "./resources";

/**
 * Compiles a validated document snapshot into OFD bytes.
 *
 * @param snapshot - Validated immutable document snapshot.
 * @returns Complete deterministic OFD package bytes.
 */
export function compileOFDDocument(
  snapshot: OFDDocumentSnapshot
): Uint8Array {
  const document = assignOFDDocument(snapshot);
  const entries = new Map<string, string | Uint8Array>();
  entries.set("OFD.xml", createOFDEntryXml(document));
  entries.set("Doc_0/Document.xml", createOFDDocumentXml(document));
  if (document.fonts.length > 0
    || document.colorSpaces.length > 0
    || document.drawParams.length > 0) {
    entries.set("Doc_0/PublicRes.xml", createOFDPublicResourcesXml(document));
  }
  if (document.images.length > 0 || document.compositeGraphicUnits.length > 0) {
    entries.set("Doc_0/DocumentRes.xml", createOFDDocumentResourcesXml(document));
  }
  if (document.attachments.length > 0) {
    entries.set("Doc_0/Attachments.xml", createOFDAttachmentsXml(document));
  }
  if (document.pages.some((page) => page.annotations.length > 0)) {
    entries.set("Doc_0/Annotations.xml", createOFDAnnotationsXml(document));
  }
  for (const page of document.pages) {
    entries.set(page.packagePath, createOFDPageXml(page, document));
    if (page.pageResourcePackagePath) {
      entries.set(page.pageResourcePackagePath, createOFDPageResourcesXml(page));
    }
    if (page.annotationPackagePath) {
      entries.set(
        page.annotationPackagePath,
        createOFDPageAnnotationsXml(page, document)
      );
    }
  }
  for (const template of document.templates) {
    entries.set(template.packagePath, createOFDPageXml(template, document));
  }
  for (const font of document.fonts) {
    if (font.packagePath && font.source.data) {
      entries.set(font.packagePath, font.source.data);
    }
  }
  for (const image of document.images) {
    entries.set(image.packagePath, image.source.data);
  }
  for (const image of document.pageImages) {
    entries.set(image.packagePath, image.source.data);
  }
  for (const attachment of document.attachments) {
    entries.set(attachment.packagePath, attachment.source.data);
  }
  return createOFDArchive(entries);
}
