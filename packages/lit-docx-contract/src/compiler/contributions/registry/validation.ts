import {
  failDocxContributionRegistration
} from "../registration-error.js";
import type { DocxContributionEntry } from "../types.js";

type AnyDocxContributionEntry = DocxContributionEntry<any, any, any>;

/**
 * Validates fields shared by every DOCX contribution.
 *
 * @param entry - Contribution and owner to validate.
 * @param byId - Mutable exact id lookup.
 * @param fieldClaims - Mutable exact model-field direction lookup.
 */
export function validateBase<
  Entry extends AnyDocxContributionEntry
>(
  entry: Entry,
  byId: Map<string, Entry>,
  fieldClaims: Map<string, Entry>
): void {
  const { contribution, ownerId } = entry;
  if (ownerId.trim().length === 0) {
    failDocxContributionRegistration(
      "empty-owner-id",
      "DOCX contribution owners must have a non-empty id."
    );
  }
  if (contribution.id.trim().length === 0) {
    failDocxContributionRegistration(
      "empty-id",
      `DOCX contribution from "${ownerId}" must have a non-empty id.`
    );
  }
  const duplicate = byId.get(contribution.id);
  if (duplicate !== undefined) {
    failDocxContributionRegistration(
      "duplicate-id",
      `Duplicate DOCX contribution id "${contribution.id}" from "${duplicate.ownerId}" and "${ownerId}".`
    );
  }
  if (contribution.fieldCapabilities.length === 0) {
    failDocxContributionRegistration(
      "empty-capabilities",
      `DOCX contribution "${contribution.id}" must declare at least one field capability.`
    );
  }
  validateFieldCapabilities(entry, fieldClaims);
  byId.set(contribution.id, entry);
}

/**
 * Validates one node or mark codec shape.
 *
 * @param entry - Owning contribution entry.
 * @param importer - Optional import declaration.
 * @param exporter - Optional export declaration.
 */
export function validateCodec(
  entry: AnyDocxContributionEntry,
  importer: object | undefined,
  exporter: object | undefined
): void {
  if (importer === undefined && exporter === undefined) {
    failDocxContributionRegistration(
      "empty-codec",
      `DOCX codec "${entry.contribution.id}" must define import or export.`
    );
  }
}

/**
 * Validates field directions, evidence, and exact ownership.
 *
 * @param entry - Owning contribution entry.
 * @param fieldClaims - Mutable exact model-field direction lookup.
 */
function validateFieldCapabilities<
  Entry extends AnyDocxContributionEntry
>(
  entry: Entry,
  fieldClaims: Map<string, Entry>
): void {
  for (const capability of entry.contribution.fieldCapabilities) {
    if (capability.directions.length === 0) {
      failDocxContributionRegistration(
        "empty-capability-direction",
        `DOCX contribution "${entry.contribution.id}" has a capability without a direction.`
      );
    }
    validateCapabilityEvidence(entry, capability);
    const modelField = capability.modelField;
    if (modelField === undefined) continue;
    if (modelField.name.trim().length === 0
      || modelField.field.trim().length === 0) {
      failDocxContributionRegistration(
        "empty-model-field",
        `DOCX contribution "${entry.contribution.id}" has an empty model-field claim.`
      );
    }
    for (const direction of capability.directions) {
      const key = [
        modelField.kind,
        modelField.name,
        modelField.field,
        direction
      ].join("\u0000");
      const duplicate = fieldClaims.get(key);
      if (duplicate !== undefined) {
        failDocxContributionRegistration(
          "duplicate-field-capability-claim",
          `Duplicate DOCX model-field claim "${modelField.kind}:${modelField.name}.${modelField.field}" for ${direction} from "${duplicate.contribution.id}" and "${entry.contribution.id}".`
        );
      }
      fieldClaims.set(key, entry);
    }
  }
}

/**
 * Validates diagnostics and authority carried by one field decision.
 *
 * @param entry - Owning contribution.
 * @param capability - Field decision to validate.
 */
function validateCapabilityEvidence(
  entry: AnyDocxContributionEntry,
  capability: AnyDocxContributionEntry["contribution"]["fieldCapabilities"][number]
): void {
  if ((capability.disposition === "approximated"
    || capability.disposition === "unsupported")
    && (capability.diagnosticCodes?.length ?? 0) === 0) {
    failDocxContributionRegistration(
      "missing-loss-diagnostic",
      `Lossy DOCX capability "${capability.field}" from "${entry.contribution.id}" must declare a diagnostic code.`
    );
  }
  if (capability.disposition === "preserved"
    && (capability.preservation === undefined
      || capability.preservation.authority.trim().length === 0
      || capability.preservation.invalidation.trim().length === 0)) {
    failDocxContributionRegistration(
      "missing-preservation-evidence",
      `Preserved DOCX capability "${capability.field}" from "${entry.contribution.id}" must declare authority and invalidation.`
    );
  }
}
