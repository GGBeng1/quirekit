import { escapeHtml, formatDuration } from "../format";
import type {
  QuireDevtoolsMeasuredPhase,
  QuireDevtoolsOperationDetails,
  QuireDevtoolsOperationEntry,
  QuireDevtoolsOperationStepSummary
} from "../../types";

/**
 * Renders an operation detail row for the timeline table.
 *
 * @param entry - Operation entry to render.
 * @returns Detail table row HTML.
 */
export function renderOperationDetailRow(
  entry: QuireDevtoolsOperationEntry
): string {
  const content = renderOperationDetailContent(entry);

  if (!content) {
    return "";
  }

  return [
    "<tr class=\"qk-devtools-entry-detail\">",
    `<td colspan="5">${content}</td>`,
    "</tr>"
  ].join("");
}

/**
 * Renders reusable operation detail content.
 *
 * @param entry - Operation entry to render.
 * @returns Detail content HTML, or an empty string when no details exist.
 */
export function renderOperationDetailContent(
  entry: QuireDevtoolsOperationEntry
): string {
  const details = entry.details;
  const items = [
    entry.trigger ? renderDetailItem("trigger", renderTrigger(entry)) : "",
    entry.phases?.length ? renderDetailItem("phases", renderPhases(entry.phases)) : "",
    details ? renderDetailItem("doc", renderDocChange(details)) : "",
    details ? renderDetailItem("selection", renderSelection(details)) : "",
    details?.meta.length ? renderDetailItem("meta", renderMeta(details)) : "",
    details?.steps.length ? renderDetailItem("steps", renderSteps(details.steps)) : ""
  ].filter(Boolean);

  if (items.length === 0) {
    return "";
  }

  return `<div class="qk-devtools-entry-detail__grid">${items.join("")}</div>`;
}

/**
 * Renders measured phase timings.
 *
 * @param phases - Phase timings to render.
 * @returns Phase detail HTML.
 */
export function renderPhases(phases: readonly QuireDevtoolsMeasuredPhase[]): string {
  return phases
    .map((phase) => `${phase.name} ${formatDuration(phase.durationMs)}`)
    .map(escapeHtml)
    .join("<br>");
}

/** Aggregated timings for one repeated measured phase name. */
interface QuireDevtoolsPhaseAggregate {
  /** Shared phase name. */
  readonly name: string;
  /** Number of measured samples carrying the phase name. */
  readonly count: number;
  /** Total measured duration across samples. */
  readonly durationMs: number;
}

/**
 * Renders a bounded phase summary for verbose render traces.
 *
 * Repeated phase names are aggregated, zero-duration samples are omitted, and
 * the most expensive groups are shown first so expanded rows stay diagnostic.
 *
 * @param phases - Measured render phases to summarize.
 * @param maxGroups - Maximum number of phase groups to show.
 * @returns Compact phase summary HTML.
 */
export function renderPhaseSummary(
  phases: readonly QuireDevtoolsMeasuredPhase[],
  maxGroups = 12
): string {
  const aggregates = new Map<string, QuireDevtoolsPhaseAggregate>();

  for (const phase of phases) {
    if (phase.durationMs <= 0) {
      continue;
    }

    const current = aggregates.get(phase.name);
    aggregates.set(phase.name, {
      name: phase.name,
      count: (current?.count ?? 0) + 1,
      durationMs: (current?.durationMs ?? 0) + phase.durationMs
    });
  }

  const ordered = [...aggregates.values()].sort((left, right) => {
    return right.durationMs - left.durationMs || left.name.localeCompare(right.name);
  });
  const limit = Number.isFinite(maxGroups)
    ? Math.max(0, Math.floor(maxGroups))
    : 0;
  const visible = ordered.slice(0, limit).map((aggregate) => {
    const count = aggregate.count > 1 ? ` x${aggregate.count}` : "";
    return escapeHtml(
      `${aggregate.name} ${formatDuration(aggregate.durationMs)}${count}`
    );
  });
  const hiddenCount = Math.max(0, ordered.length - visible.length);
  if (hiddenCount > 0) {
    visible.push(
      `+${hiddenCount} phase group${hiddenCount === 1 ? "" : "s"} hidden`
    );
  }

  return visible.join("<br>");
}

/**
 * Renders one labeled detail item.
 *
 * @param label - Item label.
 * @param value - Item value HTML.
 * @returns Detail item HTML.
 */
function renderDetailItem(label: string, value: string): string {
  return [
    "<div class=\"qk-devtools-entry-detail__item\">",
    `<span>${escapeHtml(label)}</span>`,
    `<strong>${value}</strong>`,
    "</div>"
  ].join("");
}

/**
 * Renders the browser trigger attached to an operation.
 *
 * @param entry - Operation entry.
 * @returns Trigger label.
 */
function renderTrigger(entry: QuireDevtoolsOperationEntry): string {
  const trigger = entry.trigger;

  if (!trigger) {
    return "";
  }

  return escapeHtml([
    trigger.label ?? trigger.source,
    trigger.key ? `key=${trigger.key}` : "",
    trigger.inputType ? `input=${trigger.inputType}` : "",
    trigger.target ?? ""
  ].filter(Boolean).join(" / "));
}

/**
 * Renders document size and changed-range details.
 *
 * @param details - Operation details.
 * @returns Document change label.
 */
function renderDocChange(details: QuireDevtoolsOperationDetails): string {
  const sizes = details.docBeforeSize !== undefined && details.docAfterSize !== undefined
    ? `${details.docBeforeSize}->${details.docAfterSize}`
    : "unknown";
  const range = details.changedRange
    ? ` changed ${details.changedRange.from}-${details.changedRange.to}`
    : "";

  return escapeHtml(`${sizes}${range}`);
}

/**
 * Renders selection details.
 *
 * @param details - Operation details.
 * @returns Selection label.
 */
function renderSelection(details: QuireDevtoolsOperationDetails): string {
  if (details.selectionFrom === undefined || details.selectionTo === undefined) {
    return "unknown";
  }

  return escapeHtml(
    `${details.selectionType ?? "Selection"} ${details.selectionFrom}-${details.selectionTo}`
  );
}

/**
 * Renders metadata summaries.
 *
 * @param details - Operation details.
 * @returns Metadata label.
 */
function renderMeta(details: QuireDevtoolsOperationDetails): string {
  return details.meta
    .map((meta) => `${meta.key}=${meta.preview}`)
    .map(escapeHtml)
    .join("<br>");
}

/**
 * Renders step summaries.
 *
 * @param steps - Step summaries.
 * @returns Step label HTML.
 */
function renderSteps(steps: readonly QuireDevtoolsOperationStepSummary[]): string {
  return steps.map(renderStep).join("<br>");
}

/**
 * Renders one step summary.
 *
 * @param step - Step summary.
 * @returns Step summary label.
 */
function renderStep(step: QuireDevtoolsOperationStepSummary): string {
  const range = step.from !== undefined || step.to !== undefined
    ? ` ${step.from ?? "?"}-${step.to ?? "?"}`
    : step.position !== undefined
      ? ` @${step.position}`
      : "";
  const sizes = step.deletedSize !== undefined || step.insertedSize !== undefined
    ? ` del=${step.deletedSize ?? 0} ins=${step.insertedSize ?? 0}`
    : "";
  const content = [
    step.textPreview ? `text=${JSON.stringify(step.textPreview)}` : "",
    step.nodeTypes?.length ? `nodes=${step.nodeTypes.join(",")}` : "",
    step.mark ? `mark=${step.mark}` : "",
    step.attr ? `attr=${step.attr}` : ""
  ].filter(Boolean).join(" ");

  return escapeHtml(`#${step.index} ${step.type}${range}${sizes}${content ? ` ${content}` : ""}`);
}
