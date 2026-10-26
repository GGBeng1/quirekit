import type {
  ClassicEditorCustomWebFontSourceRecord,
  ClassicEditorStylesheetFontSourceRecord,
  ClassicEditorFontLibraryPersistedState,
  ClassicEditorFontLibraryPersistence
} from "../../types";
import { parseQuireFontSourceDescriptor } from "@quirekit/web-fonts";
import { createClassicStylesheetFontSource } from "./stylesheet";

const STORAGE_KEY = "quirekit.classic.font-library.v1";

/** @returns Fresh empty font-Hub product state. */
export function createEmptyClassicEditorFontLibraryState(): ClassicEditorFontLibraryPersistedState {
  return { sourceSettings: {}, importedFamilies: [], recentFamilies: [], customSources: [] };
}

/**
 * Creates browser-local font-Hub persistence with an in-memory fallback.
 *
 * @param storage - Optional explicit Web Storage boundary.
 * @returns Synchronous persistence used during Classic mount.
 */
export function createClassicEditorLocalFontLibraryPersistence(
  storage?: Storage | undefined
): ClassicEditorFontLibraryPersistence {
  let memory = createEmptyClassicEditorFontLibraryState();

  /** @returns Explicit or current-realm local storage when accessible. */
  function resolveStorage(): Storage | undefined {
    if (storage !== undefined) return storage;
    try {
      return globalThis.localStorage;
    } catch {
      return undefined;
    }
  }

  return {
    /** @inheritdoc */
    load(): ClassicEditorFontLibraryPersistedState {
      const currentStorage = resolveStorage();
      if (currentStorage === undefined) return cloneState(memory);
      try {
        const raw = currentStorage.getItem(STORAGE_KEY);
        if (raw === null) return createEmptyClassicEditorFontLibraryState();
        return parsePersistedState(JSON.parse(raw) as unknown);
      } catch {
        return createEmptyClassicEditorFontLibraryState();
      }
    },
    /** @inheritdoc */
    save(state: ClassicEditorFontLibraryPersistedState): void {
      memory = cloneState(state);
      const currentStorage = resolveStorage();
      if (currentStorage === undefined) return;
      try {
        currentStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Product-local metadata can fall back to this mount's memory state.
      }
    }
  };
}

/**
 * Creates deterministic in-memory persistence for hosts and tests.
 *
 * @param initial - Optional initial state.
 * @returns Replaceable synchronous persistence.
 */
export function createClassicEditorMemoryFontLibraryPersistence(
  initial: ClassicEditorFontLibraryPersistedState = createEmptyClassicEditorFontLibraryState()
): ClassicEditorFontLibraryPersistence {
  let state = cloneState(initial);
  return {
    /** @inheritdoc */
    load: (): ClassicEditorFontLibraryPersistedState => cloneState(state),
    /** @inheritdoc */
    save(next: ClassicEditorFontLibraryPersistedState): void {
      state = cloneState(next);
    }
  };
}

/**
 * Parses only the stable JSON-safe subset of local font-Hub state.
 *
 * @param value - Unknown local storage value.
 * @returns Valid state or an empty state.
 */
function parsePersistedState(value: unknown): ClassicEditorFontLibraryPersistedState {
  if (!isRecord(value)) return createEmptyClassicEditorFontLibraryState();
  const settingsValue = isRecord(value.sourceSettings) ? value.sourceSettings : {};
  const sourceSettings: Record<string, Readonly<Record<string, string>>> = {};
  for (const [sourceId, candidate] of Object.entries(settingsValue)) {
    if (!isRecord(candidate)) continue;
    sourceSettings[sourceId] = Object.fromEntries(
      Object.entries(candidate).filter((entry): entry is [string, string] => (
        typeof entry[1] === "string"
      ))
    );
  }
  const importedFamilies = Array.isArray(value.importedFamilies)
    ? value.importedFamilies.filter(isImportedFamily)
    : [];
  const recentFamilies = Array.isArray(value.recentFamilies)
    ? value.recentFamilies.filter((family): family is string => (
        typeof family === "string" && family.trim().length > 0
      )).slice(0, 5)
    : [];
  const customSources = Array.isArray(value.customSources)
    ? value.customSources.flatMap(parseCustomSource)
    : [];
  const stylesheetSources = Array.isArray(value.stylesheetSources)
    ? value.stylesheetSources.flatMap(parseStylesheetSource)
    : [];
  return cloneState({ sourceSettings, importedFamilies, recentFamilies, customSources,
    ...(stylesheetSources.length ? { stylesheetSources } : {}) });
}

/**
 * Restores only bounded, inert, validated CSS snapshots.
 * @param value - Unknown local storage record.
 * @returns One validated snapshot or no entry.
 */
function parseStylesheetSource(value: unknown): readonly ClassicEditorStylesheetFontSourceRecord[] {
  if (!isRecord(value) || typeof value.url !== "string" || typeof value.name !== "string"
    || typeof value.css !== "string" || typeof value.enabledAt !== "number") return [];
  const record = { url: value.url, name: value.name, css: value.css, enabledAt: value.enabledAt };
  try { createClassicStylesheetFontSource(record); return [record]; } catch { return []; }
}

/**
 * Parses one persisted declarative source through the shared protocol validator.
 *
 * @param value - Candidate custom source record.
 * @returns One validated record or an empty list.
 */
function parseCustomSource(
  value: unknown
): readonly ClassicEditorCustomWebFontSourceRecord[] {
  if (!isRecord(value)
    || typeof value.descriptorUrl !== "string"
    || typeof value.enabledAt !== "number") return [];
  try {
    return [{
      descriptorUrl: value.descriptorUrl,
      descriptor: parseQuireFontSourceDescriptor(value.descriptor, value.descriptorUrl),
      enabledAt: value.enabledAt
    }];
  } catch {
    return [];
  }
}

/**
 * Reports whether one local value has the required imported-family fields.
 *
 * @param value - Candidate imported family.
 * @returns Whether the record is safe to expose to the runtime.
 */
function isImportedFamily(
  value: unknown
): value is ClassicEditorFontLibraryPersistedState["importedFamilies"][number] {
  return isRecord(value)
    && typeof value.family === "string"
    && value.family.trim().length > 0
    && typeof value.sourceId === "string"
    && typeof value.sourceLabel === "string"
    && typeof value.importedAt === "number"
    && isRecord(value.license)
    && typeof value.license.name === "string"
    && typeof value.license.url === "string";
}

/**
 * Clones local state through its JSON-safe representation.
 *
 * @param state - State to isolate from later mutation.
 * @returns Independent state snapshot.
 */
function cloneState(
  state: ClassicEditorFontLibraryPersistedState
): ClassicEditorFontLibraryPersistedState {
  return JSON.parse(JSON.stringify(state)) as ClassicEditorFontLibraryPersistedState;
}

/**
 * Reports whether a value is a non-array record.
 *
 * @param value - Candidate value.
 * @returns Whether the value is record-shaped.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
