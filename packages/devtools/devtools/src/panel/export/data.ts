import type {
  QuireDevtools,
  QuireDevtoolsEntry,
  QuireDevtoolsInteractionEntry
} from "../../types";

/** Default number of newest entries exported by the recent export action. */
export const defaultExportTopCount = 25;

const maxExportTopCount = 500;

/** Export scopes supported by the devtools panel. */
export type QuireDevtoolsExportScope = "interactions" | "recent" | "slow";

/** Options used to create a devtools export payload. */
export interface QuireDevtoolsExportOptions {
  /** Export scope selected by the user. */
  readonly scope: QuireDevtoolsExportScope;
  /** Number of newest rows to export for the recent scope. */
  readonly topCount?: number | undefined;
  /** Deterministic export timestamp used by tests. */
  readonly exportedAt?: string | undefined;
}

/** JSON payload written by devtools export actions. */
export interface QuireDevtoolsExportPayload {
  /** Payload schema version. */
  readonly version: 1;
  /** ISO timestamp when the payload was created. */
  readonly exportedAt: string;
  /** Export scope selected by the user. */
  readonly scope: QuireDevtoolsExportScope;
  /** Number of newest rows requested for the recent scope. */
  readonly topCount?: number | undefined;
  /** Number of primary entries included in the export. */
  readonly entryCount: number;
  /** Primary exported entries, ordered newest first like the panel. */
  readonly entries: readonly QuireDevtoolsEntry[];
  /** Operation/render entries referenced by interaction exports. */
  readonly relatedEntries?: readonly QuireDevtoolsEntry[] | undefined;
}

/**
 * Normalizes the recent export count.
 *
 * @param value - User-provided count.
 * @returns Count clamped to the retained entry range.
 */
export function normalizeExportTopCount(value: number): number {
  if (!Number.isFinite(value)) {
    return defaultExportTopCount;
  }

  return Math.min(maxExportTopCount, Math.max(1, Math.floor(value)));
}

/**
 * Creates a serializable devtools export payload.
 *
 * @param devtools - Devtools instance to read.
 * @param options - Export options.
 * @returns Structured export payload.
 */
export function createDevtoolsExportPayload(
  devtools: Pick<QuireDevtools, "getEntries">,
  options: QuireDevtoolsExportOptions
): QuireDevtoolsExportPayload {
  const allEntries = devtools.getEntries();
  const topCount = normalizeExportTopCount(options.topCount ?? defaultExportTopCount);
  const entries = selectExportEntries(allEntries, options.scope, topCount);
  const relatedEntries = options.scope === "interactions" || options.scope === "slow"
    ? collectInteractionRelatedEntries(entries, allEntries)
    : undefined;

  return {
    version: 1,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    scope: options.scope,
    ...(options.scope === "recent" ? { topCount } : {}),
    entryCount: entries.length,
    entries,
    ...(relatedEntries ? { relatedEntries } : {})
  };
}

/**
 * Converts an export payload to formatted JSON.
 *
 * @param payload - Payload to stringify.
 * @returns Pretty JSON text.
 */
export function createDevtoolsExportText(
  payload: QuireDevtoolsExportPayload
): string {
  return JSON.stringify(payload, null, 2);
}

/**
 * Selects entries for an export scope.
 *
 * @param entries - Chronological recorder entries.
 * @param scope - Export scope.
 * @param topCount - Number of newest entries for recent exports.
 * @returns Entries ordered newest first.
 */
function selectExportEntries(
  entries: readonly QuireDevtoolsEntry[],
  scope: QuireDevtoolsExportScope,
  topCount: number
): readonly QuireDevtoolsEntry[] {
  const newestFirst = [...entries].reverse();

  if (scope === "slow") {
    return newestFirst.filter((entry) => entry.slow);
  }

  if (scope === "interactions") {
    return newestFirst.filter((entry) => entry.kind === "interaction");
  }

  return newestFirst.slice(0, topCount);
}

/**
 * Collects operation/render entries referenced by exported interactions.
 *
 * @param entries - Primary exported entries.
 * @param allEntries - Chronological recorder entries.
 * @returns Related entries ordered newest first, or undefined when none exist.
 */
function collectInteractionRelatedEntries(
  entries: readonly QuireDevtoolsEntry[],
  allEntries: readonly QuireDevtoolsEntry[]
): readonly QuireDevtoolsEntry[] | undefined {
  const interactionEntries = entries.filter(
    (entry): entry is QuireDevtoolsInteractionEntry => entry.kind === "interaction"
  );
  const primaryIds = new Set(entries.map((entry) => entry.id));
  const relatedIds = new Set<number>();

  for (const interaction of interactionEntries) {
    for (const id of interaction.operationEntryIds ?? []) {
      relatedIds.add(id);
    }
    for (const id of interaction.renderEntryIds ?? []) {
      relatedIds.add(id);
    }
  }

  if (relatedIds.size === 0) {
    return undefined;
  }

  return [...allEntries]
    .reverse()
    .filter((entry) => relatedIds.has(entry.id) && !primaryIds.has(entry.id));
}
