import { escapeHtml, formatDuration } from "../format";
import { formatRenderCacheCounters } from "../cache";
import {
  renderOperationDetailContent,
  renderPhaseSummary
} from "./operation-detail";
import type {
  QuireDevtoolsEntry,
  QuireDevtoolsInteractionEntry,
  QuireDevtoolsOperationEntry,
  QuireDevtoolsRenderEntry
} from "../../types";

/**
 * Renders the related log group for one interaction entry.
 *
 * @param interaction - Interaction whose related logs should be shown.
 * @param entries - All recorder entries.
 * @returns Detail table row HTML.
 */
export function renderInteractionLogGroup(
  interaction: QuireDevtoolsInteractionEntry,
  entries: readonly QuireDevtoolsEntry[],
  columnCount = 7
): string {
  const relatedEntries = findInteractionRelatedEntries(interaction, entries);
  const content = relatedEntries.length > 0
    ? relatedEntries.map(renderInteractionRelatedEntry).join("")
    : "<div class=\"qk-devtools-log-group__empty\">No related operation or render entries captured.</div>";

  return [
    "<tr class=\"qk-devtools-interaction-detail\">",
    `<td colspan="${columnCount}"><div class="qk-devtools-log-group">${content}</div></td>`,
    "</tr>"
  ].join("");
}

/**
 * Finds operation and render entries related to an interaction.
 *
 * @param interaction - Interaction entry to inspect.
 * @param entries - All recorder entries.
 * @returns Related entries in chronological order.
 */
function findInteractionRelatedEntries(
  interaction: QuireDevtoolsInteractionEntry,
  entries: readonly QuireDevtoolsEntry[]
): readonly (QuireDevtoolsOperationEntry | QuireDevtoolsRenderEntry)[] {
  const explicitIds = new Set([
    ...(interaction.operationEntryIds ?? []),
    ...(interaction.renderEntryIds ?? [])
  ]);
  const hasExplicitIds = interaction.operationEntryIds !== undefined ||
    interaction.renderEntryIds !== undefined;

  if (hasExplicitIds) {
    return entries.filter((entry): entry is QuireDevtoolsOperationEntry | QuireDevtoolsRenderEntry => {
      return (entry.kind === "operation" || entry.kind === "render") &&
        explicitIds.has(entry.id);
    });
  }

  return entries.filter((entry): entry is QuireDevtoolsOperationEntry | QuireDevtoolsRenderEntry => {
    return (entry.kind === "operation" || entry.kind === "render") &&
      entry.startedAt >= interaction.startedAt &&
      entry.startedAt <= interaction.endedAt;
  });
}

/**
 * Renders one operation or render entry inside an interaction group.
 *
 * @param entry - Entry to render.
 * @returns Log group entry HTML.
 */
function renderInteractionRelatedEntry(
  entry: QuireDevtoolsOperationEntry | QuireDevtoolsRenderEntry
): string {
  return entry.kind === "operation"
    ? renderInteractionOperationEntry(entry)
    : renderInteractionRenderEntry(entry);
}

/**
 * Renders one operation entry inside an interaction group.
 *
 * @param entry - Operation entry to render.
 * @returns Log group entry HTML.
 */
function renderInteractionOperationEntry(
  entry: QuireDevtoolsOperationEntry
): string {
  const detail = renderOperationDetailContent(entry);

  return [
    "<article class=\"qk-devtools-log-group__entry\" data-kind=\"operation\">",
    renderRelatedEntryHeader(
      entry,
      "operation",
      entry.source,
      `${formatDuration(entry.durationMs)} / ${entry.slow ? "slow" : "ok"}`
    ),
    detail ? `<div class="qk-devtools-log-group__detail">${detail}</div>` : "",
    "</article>"
  ].join("");
}

/**
 * Renders one render entry inside an interaction group.
 *
 * @param entry - Render entry to render.
 * @returns Log group entry HTML.
 */
function renderInteractionRenderEntry(entry: QuireDevtoolsRenderEntry): string {
  const render = entry.render;
  const detailItems = [
    renderRelatedMetric("view", `${render.viewId} / ${render.mode}`),
    renderRelatedMetric("strategy", render.strategy ?? render.reason ?? "render"),
    renderRelatedMetric(
      "display",
      `${render.displayWidth}x${render.displayHeight}@${render.devicePixelRatio ?? 1}`
    ),
    renderRelatedMetric(
      "content",
      `${render.commandCount} cmds / ${render.blockCount} blocks`
    ),
    renderRelatedMetric(
      "selection",
      `${render.caretCount} carets / ${render.selectionRangeCount} ranges`
    ),
    renderRelatedMetric("overlays", String(render.overlayCount)),
    render.phases?.length
      ? renderRelatedMetricHtml(
          "phase summary",
          renderPhaseSummary(render.phases)
        )
      : "",
    render.cacheCounterDelta
      ? renderRelatedMetric(
          "cache delta",
          formatRenderCacheCounters(render.cacheCounterDelta)
        )
      : ""
  ].join("");

  return [
    "<article class=\"qk-devtools-log-group__entry\" data-kind=\"render\">",
    renderRelatedEntryHeader(
      entry,
      "render",
      `${render.viewId} / ${render.strategy ?? "render"}`,
      entry.measured ? formatDuration(entry.durationMs) : "observed"
    ),
    `<div class="qk-devtools-entry-detail__grid">${detailItems}</div>`,
    "</article>"
  ].join("");
}

/**
 * Renders the header for a related interaction log entry.
 *
 * @param entry - Entry being rendered.
 * @param kind - Entry kind label.
 * @param name - Entry name.
 * @param status - Entry status text.
 * @returns Log group header HTML.
 */
function renderRelatedEntryHeader(
  entry: QuireDevtoolsOperationEntry | QuireDevtoolsRenderEntry,
  kind: string,
  name: string,
  status: string
): string {
  return [
    "<div class=\"qk-devtools-log-group__head\">",
    `<span>#${entry.id}</span>`,
    `<strong>${escapeHtml(kind)}</strong>`,
    `<em>${escapeHtml(name)}</em>`,
    `<small>${escapeHtml(status)}</small>`,
    "</div>"
  ].join("");
}

/**
 * Renders a compact metric cell inside a related log entry.
 *
 * @param label - Metric label.
 * @param value - Metric value.
 * @returns Metric item HTML.
 */
function renderRelatedMetric(label: string, value: string): string {
  return renderRelatedMetricHtml(label, escapeHtml(value));
}

/**
 * Renders a compact metric cell whose value is already HTML-safe.
 *
 * @param label - Metric label.
 * @param value - HTML-safe metric value.
 * @returns Metric item HTML.
 */
function renderRelatedMetricHtml(label: string, value: string): string {
  return [
    "<div class=\"qk-devtools-entry-detail__item\">",
    `<span>${escapeHtml(label)}</span>`,
    `<strong>${value}</strong>`,
    "</div>"
  ].join("");
}
