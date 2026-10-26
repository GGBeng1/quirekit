import type { ClassicPrimitiveOverlayRegistration } from "../types";

/** Immutable active record with deterministic visual ordering facts. */
export interface ClassicPrimitiveOverlayEntry {
  /** Frozen registration facts. */
  readonly registration: ClassicPrimitiveOverlayRegistration;
  /** Monotonic opening sequence. */
  readonly sequence: number;
  /** Validated parent-chain depth. */
  readonly depth: number;
}

/** Finds an active identity across all isolated editor roots. */
export function findOverlayEntry(
  entriesByRoot: ReadonlyMap<object, ReadonlyMap<string, ClassicPrimitiveOverlayEntry>>,
  id: string
): { readonly root: object; readonly entry: ClassicPrimitiveOverlayEntry } | undefined {
  for (const [root, entries] of entriesByRoot) {
    const entry = entries.get(id);
    if (entry !== undefined) return { root, entry };
  }
  return undefined;
}

/** Reads or creates one root-local entry collection. */
export function entriesForRoot(
  entriesByRoot: Map<object, Map<string, ClassicPrimitiveOverlayEntry>>,
  root: object
): Map<string, ClassicPrimitiveOverlayEntry> {
  const existing = entriesByRoot.get(root);
  if (existing !== undefined) return existing;
  const entries = new Map<string, ClassicPrimitiveOverlayEntry>();
  entriesByRoot.set(root, entries);
  return entries;
}

/** Lists direct descendants in low-to-high stack order. */
export function childrenOfOverlay(
  entries: ReadonlyMap<string, ClassicPrimitiveOverlayEntry>,
  parentId: string
): readonly ClassicPrimitiveOverlayEntry[] {
  return [...entries.values()]
    .filter((entry) => entry.registration.parentId === parentId)
    .sort(compareOverlayEntries);
}

/** Returns one root's topmost entry. */
export function topOverlayEntry(
  entries: ReadonlyMap<string, ClassicPrimitiveOverlayEntry> | undefined
): ClassicPrimitiveOverlayEntry | undefined {
  return [...(entries?.values() ?? [])].sort(compareOverlayEntries).at(-1);
}

/** Returns active ids in stable low-to-high visual order. */
export function activeOverlayIds(
  entriesByRoot: ReadonlyMap<object, ReadonlyMap<string, ClassicPrimitiveOverlayEntry>>,
  root?: object
): readonly string[] {
  const entries = root === undefined
    ? [...entriesByRoot.values()].flatMap((value) => [...value.values()])
    : [...(entriesByRoot.get(root)?.values() ?? [])];
  return entries.sort(compareOverlayEntries).map((entry) => entry.registration.id);
}

/** Returns the visually topmost entry across independent editor roots. */
export function topOverlayAcrossRoots(
  entriesByRoot: ReadonlyMap<object, ReadonlyMap<string, ClassicPrimitiveOverlayEntry>>
): { readonly root: object; readonly entry: ClassicPrimitiveOverlayEntry } | undefined {
  return [...entriesByRoot.keys()]
    .map((root) => ({ root, entry: topOverlayEntry(entriesByRoot.get(root)) }))
    .filter((candidate): candidate is {
      readonly root: object;
      readonly entry: ClassicPrimitiveOverlayEntry;
    } => candidate.entry !== undefined)
    .sort((left, right) => compareOverlayEntries(left.entry, right.entry))
    .at(-1);
}

/** Finds the explicit registered root that owns a focused event target. */
export function rootForOverlayTarget(
  entriesByRoot: ReadonlyMap<object, ReadonlyMap<string, ClassicPrimitiveOverlayEntry>>,
  target: EventTarget | null
): object | undefined {
  const candidates = [...entriesByRoot]
    .filter(([, entries]) => [...entries.values()].some((entry) => (
      entry.registration.containsTarget?.(target) === true
    )))
    .map(([root]) => root);
  return candidates.at(-1);
}

/** Tests the current entry, parents and teleported descendants without DOM guessing. */
export function overlayBranchContainsTarget(
  entries: ReadonlyMap<string, ClassicPrimitiveOverlayEntry> | undefined,
  id: string,
  target: EventTarget | null
): boolean {
  if (entries === undefined) return false;
  let current = entries.get(id);
  while (current !== undefined) {
    if (current.registration.containsTarget?.(target) === true) return true;
    current = current.registration.parentId === undefined
      ? undefined
      : entries.get(current.registration.parentId);
  }
  return descendantsContainTarget(entries, id, target);
}

/** Recurses downward only after ancestors were tested independently. */
function descendantsContainTarget(
  entries: ReadonlyMap<string, ClassicPrimitiveOverlayEntry>,
  id: string,
  target: EventTarget | null
): boolean {
  const entry = entries.get(id);
  if (entry?.registration.containsTarget?.(target) === true) return true;
  return childrenOfOverlay(entries, id).some((child) => (
    descendantsContainTarget(entries, child.registration.id, target)
  ));
}

/** Orders entries by nesting, layer and opening order. */
export function compareOverlayEntries(
  left: ClassicPrimitiveOverlayEntry,
  right: ClassicPrimitiveOverlayEntry
): number {
  return left.depth - right.depth
    || (left.registration.layerPriority ?? 0) - (right.registration.layerPriority ?? 0)
    || left.sequence - right.sequence;
}
