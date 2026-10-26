import type { OFDDocumentSnapshot } from "../document/state";
import type { OFDValidationIssue } from "../document/types";
import {
  isValidOFDAttachmentDate,
  isValidOFDDate
} from "../model/date";
import { isOFDPositiveInteger } from "./numbers";
import { isValidOFDZoom } from "./navigation";

/**
 * Validates document identifiers and metadata date strings.
 *
 * @param snapshot - Frozen document snapshot.
 * @param issues - Mutable issue sink.
 */
export function validateOFDMetadataDates(
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  const documentId = snapshot.metadata.documentId;
  if (documentId !== undefined && !/^[0-9a-f]{32}$/iu.test(documentId)) {
    issues.push({
      code: "invalid-document-id",
      message: "An OFD DocID must be a 32-character hexadecimal UUID value."
    });
  }
  if (snapshot.metadata.usage !== undefined && ![
    "Normal",
    "Book",
    "NewsPaper",
    "Magzine"
  ].includes(snapshot.metadata.usage)) {
    issues.push({
      code: "invalid-document-metadata",
      message: `Invalid GB/T 33190-2016 DocUsage: "${snapshot.metadata.usage}".`
    });
  }
  for (const value of [
    snapshot.metadata.creationDate,
    snapshot.metadata.modificationDate
  ]) {
    if (value !== undefined && !isValidOFDDate(value)) {
      issues.push({
        code: "invalid-date",
        message: `Invalid OFD document date: "${value}".`
      });
    }
  }
  for (const attachment of snapshot.attachments) {
    for (const value of [
      attachment.options.creationDate,
      attachment.options.modificationDate
    ]) {
      if (value !== undefined && !isValidOFDAttachmentDate(value)) {
        issues.push({
          code: "invalid-date",
          message: `Invalid OFD attachment date: "${value}".`
        });
      }
    }
  }
}

/**
 * Validates required human-readable resource fields.
 *
 * @param snapshot - Frozen document snapshot.
 * @param issues - Mutable issue sink.
 */
export function validateOFDResources(
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  for (const font of snapshot.fonts) {
    if (font.options.fontName.trim().length === 0) {
      issues.push({
        code: "resource-invalid",
        message: "Every OFD font requires a non-empty fontName."
      });
    }
  }
  for (const attachment of snapshot.attachments) {
    if (attachment.options.name.trim().length === 0) {
      issues.push({
        code: "resource-invalid",
        message: "Every OFD attachment requires a non-empty name."
      });
    }
  }
}

/**
 * Validates document-level permission and initial-view numeric values.
 *
 * @param snapshot - Frozen document snapshot.
 * @param issues - Mutable issue sink.
 */
export function validateOFDDocumentSettings(
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  const printCopies = snapshot.permissions?.printCopies;
  if (printCopies !== undefined && !isOFDPositiveInteger(printCopies)) {
    issues.push({
      code: "invalid-number",
      message: "OFD permissions have an invalid print copy count."
    });
  }
  const zoomScale = snapshot.viewerPreferences?.zoomScale;
  if (zoomScale !== undefined && !isValidOFDZoom(zoomScale)) {
    issues.push({
      code: "invalid-number",
      message: "OFD viewer preferences have an invalid zoom scale."
    });
  }
  if (snapshot.viewerPreferences?.zoomMode !== undefined && zoomScale !== undefined) {
    issues.push({
      code: "invalid-number",
      message: "OFD viewer preferences cannot specify both zoomMode and zoomScale."
    });
  }
}
