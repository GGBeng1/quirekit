import type { ClassicEditorContribution } from "../../types";

const directories = new WeakMap<readonly ClassicEditorContribution[],
  ReadonlyMap<ClassicEditorContribution["kind"], readonly ClassicEditorContribution[]>>();
const empty: readonly ClassicEditorContribution[] = Object.freeze([]);

/**
 * Indexes immutable contribution lists once, preserving family declaration order.
 * @param contributions - Static registry or readonly presentation directory.
 * @param kind - Requested discriminator.
 * @returns Readonly family members owned by the source list's lifetime.
 */
export function readClassicEditorContributionFamily<Kind extends ClassicEditorContribution["kind"]>(
  contributions: readonly ClassicEditorContribution[],
  kind: Kind
): readonly Extract<ClassicEditorContribution, { readonly kind: Kind }>[] {
  let directory = directories.get(contributions);
  if (directory === undefined) {
    const groups = new Map<ClassicEditorContribution["kind"], ClassicEditorContribution[]>();
    for (const contribution of contributions) {
      const group = groups.get(contribution.kind);
      if (group === undefined) groups.set(contribution.kind, [contribution]);
      else group.push(contribution);
    }
    for (const group of groups.values()) Object.freeze(group);
    directory = groups;
    directories.set(contributions, directory);
  }
  return (directory.get(kind) ?? empty) as readonly Extract<ClassicEditorContribution, { readonly kind: Kind }>[];
}
