import { escapeHtml, formatDuration } from "../format";
import { formatRenderCacheCounters } from "../cache";
import { renderIcon } from "../icons";
import {
  renderOperationDetailContent,
  renderOperationDetailRow,
  renderPhaseSummary
} from "./operation-detail";
import { renderInteractionLogGroup } from "./interaction-log-group";
import type {
  QuireDevtoolsEntry,
  QuireDevtoolsInteractionEntry,
  QuireDevtoolsRenderEntry
} from "../../types";

/**
 * Renders recent performance entries.
 *
 * @param entries - Entries to display.
 * @param expandedEntryIds - Timeline entry ids whose details are expanded.
 * @param slowOnly - Whether only slow entries should be displayed.
 * @returns HTML string for the performance page.
 */
export function renderPerformancePage(
  entries: readonly QuireDevtoolsEntry[],
  expandedEntryIds: readonly number[] = [],
  slowOnly = false
): string {
  const expandedIds = new Set(expandedEntryIds);
  const visibleEntries = slowOnly
    ? entries.filter((entry) => entry.slow)
    : entries;
  const slowCount = entries.filter((entry) => entry.slow).length;
  const rows = visibleEntries
    .slice()
    .reverse()
    .map((entry) => renderPerformanceRows(entry, entries, expandedIds))
    .join("");
  const emptyMessage = slowOnly
    ? "No slow entries captured."
    : "No entries captured yet.";
  const body = rows || `<tr><td colspan="5">${emptyMessage}</td></tr>`;

  return [
    "<section class=\"qk-devtools-page\">",
    "<header class=\"qk-devtools-page__head\"><div><h3>Performance</h3><p>Operations and render passes</p></div>",
    "<label class=\"qk-devtools-filter-toggle\">",
    `<input type="checkbox" data-qk-devtools-timeline-slow-only aria-label="Show only slow timeline entries"${slowOnly ? " checked" : ""}>`,
    `<span>Slow only</span><small>${slowCount}</small>`,
    "</label></header>",
    "<div class=\"qk-devtools__log-scroll\">",
    "<table><thead><tr><th>ID</th><th>Kind</th><th>Name</th><th>Duration</th><th>Status</th></tr></thead>",
    `<tbody>${body}</tbody></table>`,
    "</div>",
    "</section>"
  ].join("");
}

/**
 * Renders one timeline row and its optional expanded detail row.
 *
 * @param entry - Entry to render.
 * @param entries - All recorder entries for interaction detail lookup.
 * @param expandedIds - Expanded timeline entry ids.
 * @returns Timeline row HTML.
 */
function renderPerformanceRows(
  entry: QuireDevtoolsEntry,
  entries: readonly QuireDevtoolsEntry[],
  expandedIds: ReadonlySet<number>
): string {
  const expanded = expandedIds.has(entry.id);
  const expandable = renderEntryDetailContent(entry, entries) !== "";
  const row = [
    `<tr${renderRowAttributes(entry, expandable, expanded)}>`,
    `<td>${renderEntryIdCell(entry, expandable, expanded)}</td>`,
    `<td>${escapeHtml(entry.kind)}</td>`,
    `<td>${escapeHtml(renderEntryName(entry))}</td>`,
    `<td>${renderEntryDuration(entry)}</td>`,
    `<td>${entry.slow ? "slow" : "ok"}</td>`,
    "</tr>"
  ].join("");

  return expandable && expanded ? row + renderEntryDetailRow(entry, entries) : row;
}

/**
 * Renders expandable detail content for an entry.
 *
 * @param entry - Entry to inspect.
 * @param entries - All recorder entries for interaction detail lookup.
 * @returns Detail content HTML, or an empty string when no details exist.
 */
function renderEntryDetailContent(
  entry: QuireDevtoolsEntry,
  entries: readonly QuireDevtoolsEntry[]
): string {
  if (entry.kind === "operation") {
    return renderOperationDetailContent(entry);
  }

  if (entry.kind === "render") {
    return renderRenderDetailContent(entry);
  }

  if (entry.kind === "interaction") {
    return renderInteractionDetailContent(entry, entries);
  }

  return "";
}

/**
 * Renders an entry detail table row.
 *
 * @param entry - Entry whose detail row should be rendered.
 * @param entries - All recorder entries for interaction detail lookup.
 * @returns Detail row HTML.
 */
function renderEntryDetailRow(
  entry: QuireDevtoolsEntry,
  entries: readonly QuireDevtoolsEntry[]
): string {
  if (entry.kind === "operation") {
    return renderOperationDetailRow(entry);
  }

  if (entry.kind === "render") {
    const content = renderRenderDetailContent(entry);

    return content
      ? `<tr class="qk-devtools-entry-detail"><td colspan="5">${content}</td></tr>`
      : "";
  }

  if (entry.kind === "interaction") {
    return renderInteractionLogGroup(entry, entries, 5);
  }

  return "";
}

/**
 * Renders compact interaction metadata for expandability checks.
 *
 * @param entry - Interaction entry to inspect.
 * @param entries - All recorder entries.
 * @returns Non-empty content when the interaction can expose related logs.
 */
function renderInteractionDetailContent(
  entry: QuireDevtoolsInteractionEntry,
  entries: readonly QuireDevtoolsEntry[]
): string {
  const hasExplicitRelatedIds =
    (entry.operationEntryIds?.length ?? 0) > 0 ||
    (entry.renderEntryIds?.length ?? 0) > 0;
  const hasRelatedEntries = hasExplicitRelatedIds ||
    entries.some((relatedEntry) => {
      return (relatedEntry.kind === "operation" || relatedEntry.kind === "render") &&
        relatedEntry.startedAt >= entry.startedAt &&
        relatedEntry.startedAt <= entry.endedAt;
    });

  return hasRelatedEntries || entry.settled
    ? "interaction detail"
    : "";
}

/**
 * Renders measured render details for a timeline render entry.
 *
 * @param entry - Render entry to render.
 * @returns Detail content HTML, or an empty string when no measured phases exist.
 */
function renderRenderDetailContent(entry: QuireDevtoolsRenderEntry): string {
  const items = [
    entry.render.phases?.length
      ? renderRenderDetailItem(
          "phase summary",
          renderPhaseSummary(entry.render.phases)
        )
      : "",
    entry.render.cacheCounterDelta
      ? renderRenderDetailItem(
          "cache delta",
          escapeHtml(formatRenderCacheCounters(entry.render.cacheCounterDelta))
        )
      : ""
  ].filter(Boolean);

  return items.length
    ? [
        "<div class=\"qk-devtools-entry-detail__grid\">",
        ...items,
        "</div>"
      ].join("")
    : "";
}

/**
 * Renders one render-entry detail item.
 *
 * @param label - Detail label.
 * @param valueHtml - Escaped detail value HTML.
 * @returns Render entry detail HTML.
 */
function renderRenderDetailItem(label: string, valueHtml: string): string {
  return [
    "<div class=\"qk-devtools-entry-detail__item\">",
    `<span>${escapeHtml(label)}</span>`,
    `<strong>${valueHtml}</strong>`,
    "</div>"
  ].join("");
}

/**
 * Renders timeline row attributes.
 *
 * @param entry - Entry to render.
 * @param expandable - Whether the row has details.
 * @param expanded - Whether the row details are expanded.
 * @returns Serialized row attributes.
 */
function renderRowAttributes(
  entry: QuireDevtoolsEntry,
  expandable: boolean,
  expanded: boolean
): string {
  const base = ` data-slow="${entry.slow ? "true" : "false"}"`;

  if (!expandable) {
    return base;
  }

  return [
    " class=\"qk-devtools-timeline-row\"",
    " data-qk-devtools-action=\"timeline-toggle\"",
    ` data-qk-devtools-entry-id="${entry.id}"`,
    ` data-expanded="${expanded ? "true" : "false"}"`,
    base,
    " tabindex=\"0\"",
    " role=\"button\"",
    ` aria-expanded="${expanded ? "true" : "false"}"`
  ].join("");
}

/**
 * Renders the first timeline cell.
 *
 * @param entry - Entry to render.
 * @param expandable - Whether the row has details.
 * @param expanded - Whether the row details are expanded.
 * @returns Entry id cell content.
 */
function renderEntryIdCell(
  entry: QuireDevtoolsEntry,
  expandable: boolean,
  expanded: boolean
): string {
  if (!expandable) {
    return `#${entry.id}`;
  }

  return [
    "<span class=\"qk-devtools-row-toggle\">",
    renderIcon(expanded ? "chevron-down" : "chevron-right"),
    `<span>#${entry.id}</span>`,
    "</span>"
  ].join("");
}

/**
 * Renders the label used for a performance entry.
 *
 * @param entry - Entry to label.
 * @returns Human-readable entry label.
 */
function renderEntryName(entry: QuireDevtoolsEntry): string {
  if (entry.kind === "operation") {
    return entry.source;
  }

  if (entry.kind === "interaction") {
    return entry.label ?? entry.source;
  }

  return `${entry.render.viewId} / ${entry.render.reason ?? entry.render.strategy ?? "render"}`;
}

/**
 * Renders duration text for a timeline entry.
 *
 * @param entry - Entry whose duration should be shown.
 * @returns Duration label.
 */
function renderEntryDuration(entry: QuireDevtoolsEntry): string {
  return entry.measured ? formatDuration(entry.durationMs) : "observed";
}
