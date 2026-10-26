import type {
  ClassicEditorCommandGroupPriority,
  ClassicEditorRibbonTabContribution
} from "../../../types";
import type {
  ClassicEditorCommandStripBudget,
  ClassicEditorCommandStripMeasurement,
  ClassicEditorTaskTabBudget,
  ResolvedClassicEditorCommandStripGroup
} from "./types";

/**
 * Applies the available inline-size budget while preserving source order.
 *
 * Lower-value groups leave first; ties remove later groups first so the most
 * familiar leading commands remain stable. Once anything overflows, the
 * discoverable overflow trigger and its gap are reserved in the same budget.
 *
 * @param groups - Active-tab groups in source order.
 * @param measurements - Most recent rendered inline sizes.
 * @param availableWidth - Command Strip content width in CSS pixels.
 * @param overflowWidth - Measured overflow trigger width in CSS pixels.
 * @param gap - Inline gap between adjacent groups and the overflow trigger.
 * @returns Direct and overflow group ids in source order.
 */
export function resolveClassicEditorCommandStripBudget(
  groups: readonly ResolvedClassicEditorCommandStripGroup[],
  measurements: readonly ClassicEditorCommandStripMeasurement[],
  availableWidth: number,
  overflowWidth: number,
  gap: number
): ClassicEditorCommandStripBudget {
  const widths = measurementMap(measurements);
  const visible = new Set(groups.map((group) => group.id));
  const fullWidth = requiredGroupWidth(groups, widths, gap);
  if (fullWidth <= finiteWidth(availableWidth)) return allVisible(groups);
  const removalOrder = [...groups].sort((left, right) => {
    const priority = priorityRank(right.priority) - priorityRank(left.priority);
    return priority !== 0
      ? priority
      : groups.indexOf(right) - groups.indexOf(left);
  });
  const reservedWidth = finiteWidth(overflowWidth) + finiteWidth(gap);
  for (const group of removalOrder) {
    visible.delete(group.id);
    const retained = groups.filter((candidate) => visible.has(candidate.id));
    if (requiredGroupWidth(retained, widths, gap) + reservedWidth <= availableWidth) break;
  }
  return Object.freeze({
    visibleIds: Object.freeze(groups.filter((group) => visible.has(group.id)).map((group) => group.id)),
    overflowIds: Object.freeze(groups.filter((group) => !visible.has(group.id)).map((group) => group.id))
  });
}

/**
 * Fits task tabs while always retaining the active task and a visible overflow.
 *
 * @param tabs - Currently applicable tabs in source order.
 * @param measurements - Last measured inline size keyed by tab id.
 * @param availableWidth - Tab-row content width.
 * @param overflowWidth - Overflow-trigger width reserved after the first removal.
 * @param gap - Inline gap between task controls.
 * @param activeId - Current active task that must remain directly reachable.
 * @returns Direct and overflow task ids in source order.
 */
export function resolveClassicEditorTaskTabBudget(
  tabs: readonly ClassicEditorRibbonTabContribution[],
  measurements: readonly ClassicEditorCommandStripMeasurement[],
  availableWidth: number,
  overflowWidth: number,
  gap: number,
  activeId: string | undefined
): ClassicEditorTaskTabBudget {
  const widths = measurementMap(measurements);
  if (requiredTabWidth(tabs, widths, gap) <= finiteWidth(availableWidth)) {
    return Object.freeze({
      visibleIds: Object.freeze(tabs.map((tab) => tab.id)),
      overflowIds: Object.freeze([])
    });
  }
  const visible = new Set(tabs.map((tab) => tab.id));
  const reserved = finiteWidth(overflowWidth) + finiteWidth(gap);
  const protectedId = tabs.some((tab) => tab.id === activeId) ? activeId : tabs[0]?.id;
  for (const tab of [...tabs].reverse()) {
    if (tab.id === protectedId) continue;
    visible.delete(tab.id);
    const retained = tabs.filter((candidate) => visible.has(candidate.id));
    if (requiredTabWidth(retained, widths, gap) + reserved <= availableWidth) break;
  }
  return Object.freeze({
    visibleIds: Object.freeze(tabs.filter((tab) => visible.has(tab.id)).map((tab) => tab.id)),
    overflowIds: Object.freeze(tabs.filter((tab) => !visible.has(tab.id)).map((tab) => tab.id))
  });
}

/** @param priority - Semantic group priority. @returns Numeric removal rank. */
function priorityRank(priority: ClassicEditorCommandGroupPriority): number {
  if (priority === "essential") return 0;
  if (priority === "primary") return 1;
  return 2;
}

/**
 * Totals measured group widths and inter-group gaps.
 *
 * @param groups - Groups currently retained.
 * @param widths - Last known group width by id.
 * @param gap - Inline gap between groups.
 * @returns Required inline size in CSS pixels.
 */
function requiredGroupWidth(
  groups: readonly ResolvedClassicEditorCommandStripGroup[],
  widths: ReadonlyMap<string, number>,
  gap: number
): number {
  return groups.reduce((total, group) => total + (widths.get(group.id) ?? 0), 0)
    + Math.max(0, groups.length - 1) * finiteWidth(gap);
}

/**
 * Totals task-tab widths and gaps.
 *
 * @param tabs - Tabs currently retained.
 * @param widths - Last known tab width by id.
 * @param gap - Inline gap between tabs.
 * @returns Required inline size in CSS pixels.
 */
function requiredTabWidth(
  tabs: readonly ClassicEditorRibbonTabContribution[],
  widths: ReadonlyMap<string, number>,
  gap: number
): number {
  return tabs.reduce((total, tab) => total + (widths.get(tab.id) ?? 0), 0)
    + Math.max(0, tabs.length - 1) * finiteWidth(gap);
}

/** @param measurements - Raw measured widths. @returns Finite widths keyed by id. */
function measurementMap(
  measurements: readonly ClassicEditorCommandStripMeasurement[]
): ReadonlyMap<string, number> {
  return new Map(measurements.map((measurement) => [
    measurement.id,
    finiteWidth(measurement.width)
  ]));
}

/** @param groups - All fitting groups. @returns Immutable all-direct result. */
function allVisible(
  groups: readonly ResolvedClassicEditorCommandStripGroup[]
): ClassicEditorCommandStripBudget {
  return Object.freeze({
    visibleIds: Object.freeze(groups.map((group) => group.id)),
    overflowIds: Object.freeze([])
  });
}

/** @param value - Candidate CSS pixel measurement. @returns Finite non-negative width. */
function finiteWidth(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
