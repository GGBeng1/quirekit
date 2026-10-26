import type { QuireKitCommandPaletteGroup } from './types';
/**
 * Keeps group and command order while matching every normalized query term.
 * @param groups - Original immutable commands.
 * @param search - User query, including composition drafts.
 * @param local - Whether the component owns filtering.
 * @returns Nonempty groups containing matching commands.
 */
export function filterCommandGroups(groups: readonly QuireKitCommandPaletteGroup[], search: string, local: boolean): QuireKitCommandPaletteGroup[] {
  const terms = search.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  return groups.map(group => ({ ...group, items: group.items.filter(item => {
    if (!local || !terms.length) return true;
    const haystack = [item.label, item.description ?? '', ...(item.keywords ?? [])].join(' ').toLocaleLowerCase();
    return terms.every(term => haystack.includes(term));
  }) })).filter(group => group.items.length > 0);
}
