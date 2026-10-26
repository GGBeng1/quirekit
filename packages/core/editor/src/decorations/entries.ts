import type {
  DecorationManagerEntry,
  DecorationSpec,
  ResolvedDecorationEntry
} from "./types";

/**
 * Resolves and validates lazy extension decoration entries.
 *
 * @param entries - Lazy entries in extension order.
 * @returns Enabled, validated entries.
 */
export function resolveDecorationEntries(
  entries: readonly DecorationManagerEntry[]
): ResolvedDecorationEntry[] {
  const result: ResolvedDecorationEntry[] = [];

  for (const entry of entries) {
    const spec = entry.addDecorations();
    if (!spec) continue;
    validateDecorationSpec(entry.name, spec);
    result.push({ name: entry.name, spec });
  }

  return result;
}

/**
 * Validates mutually-exclusive decoration update policies.
 *
 * @param name - Producing extension name.
 * @param spec - Authored decoration specification.
 */
function validateDecorationSpec(name: string, spec: DecorationSpec): void {
  const update = spec.update ?? "document";

  if (update === "changedRanges" && !spec.createInRange) {
    throw new Error(
      `Extension "${name}" uses changedRanges decorations without createInRange().`
    );
  }
  if (update !== "changedRanges" && spec.createInRange) {
    throw new Error(
      `Extension "${name}" provides createInRange() without changedRanges decorations.`
    );
  }
  if (update === "manual" && spec.shouldUpdate) {
    throw new Error(
      `Extension "${name}" cannot combine manual decorations with shouldUpdate().`
    );
  }
}
