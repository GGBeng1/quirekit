import { Decoration, DecorationSet, type Node as PMNode } from "@quirekit/pm";
import type { ProofingExtensionOptions } from "../types";
import {
  applyBlockResults,
  findIssueDecoration,
  normalizeProofingWord,
  removeSuppressedIssues
} from "./issues";
import { addProofingRange, subtractProofingRange } from "./ranges";
import type { ProofingMeta, ProofingPluginState } from "./types";

/**
 * Applies one proofing meta to the state of the current document.
 *
 * @param value - State already mapped to `doc`.
 * @param meta - Metadata of the transaction.
 * @param doc - Current document.
 * @param options - Extension options.
 * @returns Next state.
 */
export function applyProofingMeta(
  value: ProofingPluginState,
  meta: ProofingMeta,
  doc: PMNode,
  options: ProofingExtensionOptions
): ProofingPluginState {
  switch (meta.type) {
    case "enable":
      return meta.enabled ? { ...clearFindings(value), enabled: true, dirty: wholeDocument(doc) } : {
        ...clearFindings(value),
        enabled: false,
        dirty: [],
        inflight: []
      };
    case "recheck":
      return value.enabled ? { ...clearFindings(value), dirty: wholeDocument(doc) } : value;
    case "schedule": {
      let dirty = value.dirty;
      for (const range of [...meta.cleared, ...meta.pending, ...meta.resolved]) dirty = subtractProofingRange(dirty, range);
      const inflight = [
        ...value.inflight,
        ...meta.pending.map((block) => ({ ...block, originFrom: block.from, stale: false }))
      ];
      const resolved = meta.resolved.map((result) => ({ result, delta: 0 }));
      return { ...value, dirty, inflight, ...applyBlockResults(value, doc, resolved, options.maxIssues, options.appearance) };
    }
    case "results": {
      const answered = meta.blocks.flatMap((result) => {
        const block = value.inflight.find((entry) => entry.requestId === meta.requestId && entry.originFrom === result.from);
        return block === undefined || block.stale ? [] : [{ result, delta: block.from - block.originFrom }];
      });
      return {
        ...releaseRequest(value, meta.requestId),
        ...applyBlockResults(value, doc, answered, options.maxIssues, options.appearance)
      };
    }
    case "release":
      return releaseRequest(value, meta.requestId);
    case "status":
      return { ...value, sessionStatus: meta.status };
    case "suppress-words":
      return suppressWords(value, meta.words);
    case "ignore-word":
    case "add-word":
      return suppressWords(value, [meta.word]);
    case "ignore-issue":
      return ignoreIssue(value, meta.id, doc);
  }
}

/**
 * Forgets the pending blocks of a request; blocks edited meanwhile become dirty again.
 *
 * @param value - Current state.
 * @param requestId - Finished request.
 * @returns State without the request.
 */
function releaseRequest(value: ProofingPluginState, requestId: string): ProofingPluginState {
  let dirty = value.dirty;
  for (const entry of value.inflight) {
    if (entry.requestId === requestId && entry.stale && entry.to > entry.from && value.enabled) {
      dirty = addProofingRange(dirty, entry);
    }
  }
  return { ...value, dirty, inflight: value.inflight.filter((entry) => entry.requestId !== requestId) };
}

/**
 * Adds words to the suppressed set and drops their findings.
 *
 * @param value - Current state.
 * @param words - Words as written.
 * @returns Next state.
 */
function suppressWords(value: ProofingPluginState, words: readonly string[]): ProofingPluginState {
  const suppressed = new Set(value.suppressed);
  for (const word of words) suppressed.add(normalizeProofingWord(word));
  const { issues, removed } = removeSuppressedIssues(value.issues, suppressed);
  return { ...value, suppressed, issues, issueCount: value.issueCount - removed };
}

/**
 * Hides one finding at its current place; the ignore follows later edits elsewhere.
 *
 * @param value - Current state.
 * @param id - Finding identity.
 * @param doc - Current document.
 * @returns Next state.
 */
function ignoreIssue(value: ProofingPluginState, id: string, doc: PMNode): ProofingPluginState {
  const decoration = findIssueDecoration(value.issues, id);
  if (decoration === undefined) return value;
  return {
    ...value,
    issues: value.issues.remove([decoration]),
    issueCount: value.issueCount - 1,
    ignored: value.ignored.add(doc, [Decoration.inline(decoration.from, decoration.to, {}, { proofingIgnored: true })])
  };
}

/**
 * Drops every finding while keeping ignores.
 *
 * @param value - Current state.
 * @returns State without findings.
 */
function clearFindings(value: ProofingPluginState): ProofingPluginState {
  return { ...value, issues: DecorationSet.empty, issueCount: 0, limited: false };
}

/**
 * Covers the whole document.
 *
 * @param doc - Current document.
 * @returns Single interval, or none for an empty document.
 */
function wholeDocument(doc: PMNode) {
  return doc.content.size > 0 ? [{ from: 0, to: doc.content.size }] : [];
}
