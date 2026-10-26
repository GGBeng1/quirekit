import type { WordParagraphStyleRegistry } from "./types";

/**
 * Finds every named style whose effective chain includes one changed style.
 *
 * @param registry - Complete named paragraph-style registry.
 * @param styleId - Changed style identity.
 * @returns Changed style plus transitive descendants in stable registry order.
 */
export function collectWordParagraphStyleConsumerIds(
  registry: WordParagraphStyleRegistry,
  styleId: string
): readonly string[] {
  const consumers: string[] = [];
  for (const candidate of Object.keys(registry.styles)) {
    if (styleChainIncludes(registry, candidate, styleId)) consumers.push(candidate);
  }
  return Object.freeze(consumers);
}

/**
 * Checks one inheritance chain without looping on malformed source.
 *
 * @param registry - Complete named style registry.
 * @param candidateId - Candidate consumer style.
 * @param targetId - Changed ancestor style.
 * @returns Whether the target appears in the candidate chain.
 */
function styleChainIncludes(
  registry: WordParagraphStyleRegistry,
  candidateId: string,
  targetId: string
): boolean {
  const visited = new Set<string>();
  let currentId: string | null = candidateId;
  while (currentId !== null && !visited.has(currentId)) {
    if (currentId === targetId) return true;
    visited.add(currentId);
    currentId = registry.styles[currentId]?.basedOn ?? null;
  }
  return false;
}
