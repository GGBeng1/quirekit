import type { QuireKitActionDirectoryProps, QuireKitActionMenuEntry } from "../../components/action-menu";
/** @param actions - Current directory; branches retain their own navigation. @param query - Complete Unicode query. @param filter - Optional owner-neutral matching predicate. @returns Matching actions in original order, including disabled entries. */
export function filterActionDirectory(actions: readonly QuireKitActionMenuEntry[], query: string, filter?: QuireKitActionDirectoryProps["filter"]): readonly QuireKitActionMenuEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return actions;
  return actions.filter(action => filter ? filter(action, query) : `${action.label} ${action.value} ${action.group ?? ""} ${action.description ?? ""}`.toLocaleLowerCase().includes(needle));
}
