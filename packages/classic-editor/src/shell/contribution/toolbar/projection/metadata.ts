import type { ClassicToolbarEntryMeta } from "../types";

/**
 * Compares shell-created routing records; feature metadata stays inside original by identity.
 * @param previous - Earlier internal routing record.
 * @param next - Current internal routing record.
 * @returns Whether both records route to the exact same feature or command.
 */
export function sameClassicToolbarMetadata(previous: unknown, next: unknown): boolean {
  if (previous === next) return true;
  const before = previous as ClassicToolbarEntryMeta | undefined;
  const after = next as ClassicToolbarEntryMeta | undefined;
  if (!before || !after || before.kind !== after.kind) return false;
  if (before.kind === "control" && after.kind === "control") return before.control === after.control;
  if (before.kind === "widget" && after.kind === "widget") return before.contribution === after.contribution;
  if (before.kind === "menu" && after.kind === "menu") return before.groupId === after.groupId
    && before.controls.length === after.controls.length && before.controls.every((control, index) => control === after.controls[index]);
  return before.kind === "feature" && after.kind === "feature" && before.featureKey === after.featureKey
    && before.original === after.original && before.path.length === after.path.length
    && before.path.every((value, index) => value === after.path[index]);
}
