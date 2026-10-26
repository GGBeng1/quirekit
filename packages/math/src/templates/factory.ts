import type { MathTemplate, MathTemplateGroup } from './types';

/**
 * Defines one semantic visual template without coupling it to a particular UI.
 * @param id - Stable identity.
 * @param label - Chinese accessible name.
 * @param english - Human English name.
 * @param group - Browsing family.
 * @param pattern - Exact admitted source with one selection marker.
 * @param keywords - Additional search aliases.
 * @returns Reusable template descriptor.
 */
export function defineMathTemplate(id: string, label: string, english: string, group: MathTemplateGroup, pattern: string, keywords: readonly string[] = []): MathTemplate {
  return { id, label, english, group, pattern, keywords };
}
