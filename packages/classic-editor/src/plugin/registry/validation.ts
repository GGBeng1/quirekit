import type {
  ClassicEditorContribution,
  ClassicEditorImportExportService,
  ClassicEditorPlugin
} from "../../types";

/**
 * Rejects duplicate plugin ids and freezes deterministic plugin order.
 *
 * @param plugins - Product plugins to validate.
 * @returns Frozen plugin list.
 */
export function validateClassicEditorPluginIds(
  plugins: readonly ClassicEditorPlugin[]
): readonly ClassicEditorPlugin[] {
  const ids = new Set<string>();
  for (const plugin of plugins) {
    assertClassicEditorUniqueId(ids, plugin.id, "plugin");
  }
  return Object.freeze([...plugins]);
}

/**
 * Validates tab, group, and service references after contribution collection.
 *
 * @param contributions - Visible product contributions.
 * @param services - Registered document services.
 */
export function validateClassicEditorContributionReferences(
  contributions: readonly ClassicEditorContribution[],
  services: ReadonlyMap<string, ClassicEditorImportExportService>
): void {
  const tabs = new Set(
    contributions.filter((item) => item.kind === "ribbon-tab").map((item) => item.id)
  );
  const groups = new Set(
    contributions.filter((item) => item.kind === "ribbon-group").map((item) => item.id)
  );

  for (const contribution of contributions) {
    if (contribution.kind === "ribbon-group") {
      assertClassicEditorReference(tabs.has(contribution.tabId), "ribbon tab", contribution.tabId);
    }
    if (
      contribution.kind === "ribbon-control"
      || contribution.kind === "ribbon-action-control"
      || contribution.kind === "ribbon-widget"
    ) {
      assertClassicEditorReference(
        groups.has(contribution.groupId),
        "ribbon group",
        contribution.groupId
      );
    }
    if (contribution.kind === "document-service") {
      const service = services.get(contribution.service);
      assertClassicEditorReference(service !== undefined, "document service", contribution.service);
      assertClassicEditorReference(
        contribution.operation === "import"
          ? service?.import !== undefined
          : service?.export !== undefined,
        `${contribution.operation} operation on document service`,
        contribution.service
      );
    }
  }
}

/**
 * Normalizes a product shortcut signature.
 *
 * @param shortcut - Consumer shortcut string.
 * @returns Canonical lowercase modifier signature.
 */
export function normalizeClassicEditorShortcut(shortcut: string): string {
  const parts = shortcut
    .split("-")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new RangeError("Classic Editor keyboard shortcuts must not be empty.");
  }
  return parts.join("-");
}

/**
 * Adds an id to a uniqueness set or throws a diagnostic.
 *
 * @param ids - Existing ids.
 * @param id - Candidate id.
 * @param kind - Diagnostic owner kind.
 */
export function assertClassicEditorUniqueId(
  ids: Set<string>,
  id: string,
  kind: string
): void {
  if (id.trim().length === 0) {
    throw new RangeError(`Classic Editor ${kind} ids must not be empty.`);
  }
  if (ids.has(id)) {
    throw new RangeError(`Duplicate Classic Editor ${kind} id: ${id}`);
  }
  ids.add(id);
}

/**
 * Adds a unique map entry or throws a diagnostic.
 *
 * @param entries - Existing map entries.
 * @param id - Candidate id.
 * @param value - Candidate value.
 * @param kind - Diagnostic owner kind.
 */
export function assertClassicEditorUniqueMapEntry<Value>(
  entries: Map<string, Value>,
  id: string,
  value: Value,
  kind: string
): void {
  if (entries.has(id)) {
    throw new RangeError(`Duplicate Classic Editor ${kind} id: ${id}`);
  }
  if (id.trim().length === 0) {
    throw new RangeError(`Classic Editor ${kind} ids must not be empty.`);
  }
  entries.set(id, value);
}

/**
 * Throws when a contribution references an unavailable registry entry.
 *
 * @param valid - Whether the reference exists.
 * @param kind - Referenced entry kind.
 * @param id - Referenced id.
 */
function assertClassicEditorReference(valid: boolean, kind: string, id: string): void {
  if (!valid) {
    throw new RangeError(`Unknown Classic Editor ${kind} reference: ${id}`);
  }
}
