import type { LitAstNode } from "../../../core/contracts.js";
import {
  failDocxContributionRegistration
} from "../registration-error.js";
import type { DocxContributionEntry } from "../types.js";

type AnyDocxContributionEntry = DocxContributionEntry<any, any, any>;

/**
 * Selects one exact or predicate-narrowed node importer.
 *
 * @param entries - Importers registered for one LitAST type.
 * @param node - Optional candidate node used by semantic selectors.
 * @param nodeType - Exact LitAST node type.
 * @returns Unique matching importer, or undefined.
 */
export function selectNodeImporter<
  Entry extends AnyDocxContributionEntry
>(
  entries: readonly Entry[],
  node: LitAstNode | undefined,
  nodeType: string
): Entry | undefined {
  if (entries.length === 0) return undefined;
  if (entries.length === 1) {
    const entry = entries[0]!;
    const matcher = getNodeImportMatcher(entry);
    return matcher === undefined || (node !== undefined && matcher(node))
      ? entry
      : undefined;
  }
  if (node === undefined) return undefined;
  const candidates = entries.filter((entry) =>
    getNodeImportMatcher(entry)?.(node) === true
  );
  const specialized = candidates.filter(entry => entry.contribution.kind === "node-codec" && !entry.contribution.import?.fallback);
  const matches = specialized.length ? specialized : candidates;
  if (matches.length > 1) {
    failDocxContributionRegistration(
      "duplicate-node-import-claim",
      `Multiple predicate-narrowed DOCX importers matched "${nodeType}".`
    );
  }
  return matches[0];
}

/**
 * Reads the optional matcher from one node-codec entry.
 *
 * @param entry - Candidate contribution entry.
 * @returns Import matcher, or undefined for an exact claim.
 */
export function getNodeImportMatcher(
  entry: AnyDocxContributionEntry
): ((node: LitAstNode) => boolean) | undefined {
  const contribution = entry.contribution;
  return contribution.kind === "node-codec"
    ? contribution.import?.matches
    : undefined;
}
