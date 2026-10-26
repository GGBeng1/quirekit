import type { LitAstNode } from '../core/contracts.js';
import { maxStoreBytes, metadataKey, optionalKey } from './metadata.js';

/**
 * Reserves mandatory records first, then admits optional source in document
 * order. XML/resource fingerprints add bounded overhead; visible nodes remain.
 * @param source - Converted semantic document.
 * @param omitted - Optional diagnostic sink for each omitted record path.
 * @returns Source with only over-budget optional metadata removed.
 */
export function budgetRoundTripMetadata<T extends LitAstNode>(source: T, omitted?: (path: string) => void): T {
  let bytes = 8192, count = 0;
  /** @param node - Tagged node. @returns Conservative encoded record size including allocated identity and fingerprint. */
  function size(node: LitAstNode): number {
    return new TextEncoder().encode(JSON.stringify({ id: '9'.repeat(24), tag: node.attrs?.tag,
      fingerprint: 'f'.repeat(64), metadata: node.meta?.[metadataKey] })).length + 1;
  }
  /** @param node - Current source subtree. */
  function reserve(node: LitAstNode): void {
    if (node.meta?.[metadataKey] !== undefined && node.meta[optionalKey] !== true) { bytes += size(node); count++; }
    node.children?.forEach(reserve);
  }
  reserve(source);
  /** @param node - Current source subtree. @param path - Semantic source path. @returns Immutable admitted projection. */
  function admit(node: LitAstNode, path: string): LitAstNode {
    let meta = node.meta;
    if (meta?.[metadataKey] !== undefined && meta[optionalKey] === true) {
      const needed = size(node);
      if (bytes + needed > maxStoreBytes || count >= 1000) {
        const { [metadataKey]: _metadata, [optionalKey]: _optional, ...rest } = meta;
        meta = rest; omitted?.(path);
      } else { bytes += needed; count++; }
    }
    return { ...node, ...(meta === undefined ? {} : { meta }), ...(node.children ? { children: node.children.map((child, index) => admit(child, `${path}.children[${index}]`)) } : {}) };
  }
  return admit(source, 'document') as T;
}
