import type { ExtractedProofingBlock } from "../extract/types";
import type { ProofingBlockResult } from "../plugin/types";
import { toBlockResult, type ProofingCachedIssue } from "./request";

/** Block contents remembered with their findings. */
const maxCachedBlocks = 2000;

/**
 * Findings by exact block content, so undo, paste, or repeated paragraphs never reach the provider twice.
 */
export class ProofingResultCache {
  private readonly entries = new Map<string, readonly ProofingCachedIssue[]>();

  /**
   * @param defaultLanguage - Language of segments without one.
   * @param maxSuggestions - Suggestions per finding.
   */
  constructor(private readonly defaultLanguage: string | null, private readonly maxSuggestions: number) {}

  /**
   * Tests whether a block content was answered before.
   *
   * @param block - Extracted block.
   * @returns Whether findings are cached.
   */
  has(block: ExtractedProofingBlock): boolean {
    return this.entries.has(block.key);
  }

  /**
   * Stores findings of a block content, evicting the oldest entry when full.
   *
   * @param block - Extracted block.
   * @param issues - Findings in segment offsets.
   */
  remember(block: ExtractedProofingBlock, issues: readonly ProofingCachedIssue[]): void {
    this.entries.delete(block.key);
    this.entries.set(block.key, issues);
    if (this.entries.size > maxCachedBlocks) this.entries.delete(this.entries.keys().next().value!);
  }

  /**
   * Converts findings of a block into a plugin result.
   *
   * @param block - Extracted block.
   * @param issues - Findings in segment offsets; cached findings when omitted.
   * @returns Block result in extraction-time positions.
   */
  toResult(block: ExtractedProofingBlock, issues = this.entries.get(block.key) ?? []): ProofingBlockResult {
    return toBlockResult(block, issues, this.defaultLanguage, this.maxSuggestions);
  }

  /** Forgets every entry, for example after a provider change. */
  clear(): void {
    this.entries.clear();
  }
}
