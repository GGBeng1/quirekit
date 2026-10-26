import {
  failDocxContributionRegistration,
  type DocxContributionRegistrationErrorCode
} from "../registration-error.js";
import type { DocxContributionEntry } from "../types.js";
import { getNodeImportMatcher } from "./selection.js";

type AnyDocxContributionEntry = DocxContributionEntry<any, any, any>;

/**
 * Registers exact or predicate-narrowed LitAST node import claims.
 *
 * Shared node types are legal only when every owner supplies a matcher.
 *
 * @param entry - Owning node-codec entry.
 * @param claims - LitAST node types claimed by the importer.
 * @param target - Ordered importers grouped by source type.
 */
export function registerNodeImportClaims<
  Entry extends AnyDocxContributionEntry
>(
  entry: Entry,
  claims: readonly string[],
  target: Map<string, Entry[]>
): void {
  const matcher = getNodeImportMatcher(entry);
  for (const claim of claims) {
    assertClaim(entry, claim);
    const existing = target.get(claim) ?? [];
    if (existing.length > 0
      && (matcher === undefined
        || existing.some((candidate) =>
          getNodeImportMatcher(candidate) === undefined
        ))) {
      failDocxContributionRegistration(
        "duplicate-node-import-claim",
        `Duplicate DOCX claim "${claim}" from "${existing[0]!.contribution.id}" and "${entry.contribution.id}".`
      );
    }
    existing.push(entry);
    target.set(claim, existing);
  }
}

/**
 * Registers exact claims for one conversion direction.
 *
 * @param entry - Owning contribution entry.
 * @param claims - Exact source types claimed in this direction.
 * @param target - Direction-specific claim lookup.
 * @param code - Duplicate-claim error code.
 */
export function registerExactClaims<
  Entry extends AnyDocxContributionEntry
>(
  entry: Entry,
  claims: readonly string[],
  target: Map<string, Entry>,
  code: DocxContributionRegistrationErrorCode
): void {
  for (const claim of claims) {
    assertClaim(entry, claim);
    const duplicate = target.get(claim);
    if (duplicate !== undefined) {
      failDocxContributionRegistration(
        code,
        `Duplicate DOCX claim "${claim}" from "${duplicate.contribution.id}" and "${entry.contribution.id}".`
      );
    }
    target.set(claim, entry);
  }
}

/**
 * Rejects an empty registry claim.
 *
 * @param entry - Owning contribution.
 * @param claim - Candidate claim.
 */
function assertClaim(
  entry: AnyDocxContributionEntry,
  claim: string
): void {
  if (claim.trim().length === 0) {
    failDocxContributionRegistration(
      "empty-claim",
      `DOCX codec "${entry.contribution.id}" has an empty claim.`
    );
  }
}
