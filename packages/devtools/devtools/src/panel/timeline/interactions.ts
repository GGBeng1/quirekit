import { escapeHtml, formatDuration } from "../format";
import { renderIcon } from "../icons";
import { renderInteractionLogGroup } from "./interaction-log-group";
import type {
  QuireDevtoolsEntry,
  QuireDevtoolsInteractionEntry
} from "../../types";

/**
 * Renders recent input-to-render interaction traces.
 *
 * @param entries - Entries to display.
 * @param expandedInteractionIds - Interaction ids whose related logs are expanded.
 * @returns HTML string for the interaction page.
 */
export function renderInteractionsPage(
  entries: readonly QuireDevtoolsEntry[],
  expandedInteractionIds: readonly number[] = []
): string {
  const expandedIds = new Set(expandedInteractionIds);
  const interactions = entries
    .filter((entry): entry is QuireDevtoolsInteractionEntry => {
      return entry.kind === "interaction";
    })
    .slice()
    .reverse();
  const rows = interactions
    .map((entry) => renderInteractionRows(entry, entries, expandedIds.has(entry.id)))
    .join("");
  const body = rows ||
    "<tr><td colspan=\"7\">No interaction traces captured yet.</td></tr>";

  return [
    "<section class=\"qk-devtools-page\">",
    "<header class=\"qk-devtools-page__head\"><div><h3>Interactions</h3><p>Input and pointer latency to the next render-settled frame</p></div></header>",
    "<div class=\"qk-devtools__log-scroll\">",
    "<table><thead><tr><th>ID</th><th>Start</th><th>Latency</th><th>Ops</th><th>Renders</th><th>Settled</th><th>Target</th></tr></thead>",
    `<tbody>${body}</tbody></table>`,
    "</div>",
    "</section>"
  ].join("");
}

/**
 * Renders one interaction summary row and optional log group row.
 *
 * @param entry - Interaction entry to render.
 * @param entries - All recorder entries.
 * @param expanded - Whether the interaction row is expanded.
 * @returns Interaction table rows.
 */
function renderInteractionRows(
  entry: QuireDevtoolsInteractionEntry,
  entries: readonly QuireDevtoolsEntry[],
  expanded: boolean
): string {
  const row = [
    `<tr class="qk-devtools-interaction-row" data-qk-devtools-action="interaction-toggle" data-qk-devtools-entry-id="${entry.id}" data-expanded="${expanded ? "true" : "false"}" data-slow="${entry.slow ? "true" : "false"}" data-settled="${entry.settled ? "true" : "false"}" tabindex="0" role="button" aria-expanded="${expanded ? "true" : "false"}">`,
    `<td><span class="qk-devtools-row-toggle">${renderIcon(expanded ? "chevron-down" : "chevron-right")}<span>#${entry.id}</span></span></td>`,
    `<td>${escapeHtml(entry.label ?? entry.source)}</td>`,
    `<td>${formatDuration(entry.durationMs)}</td>`,
    `<td>${entry.operationCount}</td>`,
    `<td>${entry.renderCount}</td>`,
    `<td>${entry.settled ? `render #${entry.renderEntryId ?? "?"}` : "no render"}</td>`,
    `<td>${escapeHtml(entry.target ?? "unknown")}</td>`,
    "</tr>"
  ].join("");

  return expanded ? row + renderInteractionLogGroup(entry, entries) : row;
}
