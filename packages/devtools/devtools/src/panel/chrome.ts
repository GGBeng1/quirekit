import { escapeHtml } from "./format";
import { renderIcon, renderQuireKitLogo } from "./icons";
import type { QuireDevtoolsExportScope } from "./export";
import type { QuireDevtoolsPanelTab } from "./types";
import type { QuireDevtoolsEntry, QuireDevtoolsSnapshot } from "../types";

/** Topbar rendering options. */
export interface QuireDevtoolsTopbarOptions {
  /** Number of newest rows selected for recent export. */
  readonly exportTopCount: number;
  /** Whether the panel is in fullscreen mode. */
  readonly fullscreen: boolean;
}

/**
 * Renders the fixed launcher button.
 *
 * @param entries - Recent performance entries.
 * @param open - Whether the dock is open.
 * @returns HTML string for the launcher button.
 */
export function renderLauncher(
  entries: readonly QuireDevtoolsEntry[],
  open: boolean
): string {
  const status = renderLauncherStatus(entries);

  return [
    "<button type=\"button\" class=\"qk-devtools-launcher\" data-qk-devtools-action=\"toggle\" ",
    `aria-expanded="${open ? "true" : "false"}" aria-controls="qk-devtools-dialog">`,
    renderQuireKitLogo(),
    "<span class=\"qk-devtools-launcher__label\">QuireKit</span>",
    `<span class="qk-devtools-launcher__count">${escapeHtml(status)}</span>`,
    "</button>"
  ].join("");
}

/**
 * Formats the cheap live status shown by the closed launcher.
 *
 * @param entries - Recent performance entries.
 * @returns Slow-entry count when present, otherwise the total log count.
 */
export function renderLauncherStatus(
  entries: readonly QuireDevtoolsEntry[]
): string {
  const slowCount = entries.filter((entry) => entry.slow).length;

  return slowCount > 0 ? `${slowCount} slow` : `${entries.length} logs`;
}

/**
 * Renders the dock top bar.
 *
 * @param snapshot - Snapshot to summarize.
 * @param entries - Recent performance entries.
 * @param options - Topbar rendering options.
 * @returns HTML string for the top bar.
 */
export function renderTopbar(
  snapshot: QuireDevtoolsSnapshot,
  entries: readonly QuireDevtoolsEntry[],
  options: QuireDevtoolsTopbarOptions
): string {
  return [
    "<header class=\"qk-devtools-topbar\" data-qk-devtools-drag-handle>",
    "<div class=\"qk-devtools-brand\">",
    renderQuireKitLogo(),
    "<div><strong>QuireKit</strong><span>DevTools</span></div>",
    "</div>",
    `<button type="button" class="qk-devtools-drag-handle" data-qk-devtools-drag-handle aria-label="Drag QuireKit Devtools">${renderIcon("grip")}</button>`,
    `<div class="qk-devtools-status">${escapeHtml(renderSnapshotLine(snapshot))}<span>${entries.length} entries</span></div>`,
    renderExportBar(options.exportTopCount),
    `<button type="button" class="qk-devtools-icon-button" data-qk-devtools-action="clear" aria-label="Clear QuireKit Devtools entries">${renderIcon("trash")}</button>`,
    renderFullscreenButton(options.fullscreen),
    `<button type="button" class="qk-devtools-icon-button" data-qk-devtools-action="close" aria-label="Close QuireKit Devtools">${renderIcon("x")}</button>`,
    "</header>"
  ].join("");
}

/**
 * Renders the fullscreen toggle button.
 *
 * @param fullscreen - Whether the panel currently fills the viewport.
 * @returns Fullscreen toggle button HTML.
 */
function renderFullscreenButton(fullscreen: boolean): string {
  return [
    "<button type=\"button\" class=\"qk-devtools-icon-button\" data-qk-devtools-action=\"fullscreen-toggle\" ",
    `aria-label="${fullscreen ? "Exit fullscreen" : "Enter fullscreen"} QuireKit Devtools">`,
    renderIcon(fullscreen ? "minimize" : "maximize"),
    "</button>"
  ].join("");
}

/**
 * Renders topbar export controls.
 *
 * @param topCount - Number of newest rows for recent export.
 * @returns Export control HTML.
 */
function renderExportBar(topCount: number): string {
  return [
    "<div class=\"qk-devtools-export-bar\" aria-label=\"Export devtools data\">",
    renderExportButton("slow", "Slow"),
    "<label class=\"qk-devtools-export-count\">",
    "<span>Top</span>",
    `<input type="number" min="1" max="500" step="1" value="${topCount}" data-qk-devtools-export-top-count aria-label="Recent export count">`,
    "</label>",
    renderExportButton("recent", "Recent"),
    renderExportButton("interactions", "Interactions"),
    "</div>"
  ].join("");
}

/**
 * Renders one export button.
 *
 * @param scope - Export scope.
 * @param label - Button label.
 * @returns Export button HTML.
 */
function renderExportButton(scope: QuireDevtoolsExportScope, label: string): string {
  return [
    `<button type="button" data-qk-devtools-action="export" data-qk-devtools-export-scope="${scope}" aria-label="Export ${label} devtools data">`,
    renderIcon("download"),
    `<span>${escapeHtml(label)}</span>`,
    "</button>"
  ].join("");
}

/**
 * Renders the tool rail.
 *
 * @param activeTab - Active tab.
 * @param snapshot - Current snapshot.
 * @param entries - Recent entries.
 * @returns HTML string for the rail.
 */
export function renderRail(
  activeTab: QuireDevtoolsPanelTab,
  snapshot: QuireDevtoolsSnapshot,
  entries: readonly QuireDevtoolsEntry[]
): string {
  const tabs = [
    ["document", "Document", String(snapshot.docSize), "file-json"],
    [
      "interactions",
      "Interactions",
      String(entries.filter((entry) => entry.kind === "interaction").length),
      "mouse"
    ],
    ["performance", "Timeline", String(entries.length), "activity"],
    ["state", "State", String(snapshot.extensionNames.length), "braces"],
    ["render", "Render", String(snapshot.latestRender?.commandCount ?? 0), "gauge"]
  ] as const;

  return [
    "<nav class=\"qk-devtools-rail\" aria-label=\"Devtools tools\">",
    ...tabs.map(([tab, label, badge, icon]) => {
      return [
        `<button type="button" data-qk-devtools-action="tab" data-qk-devtools-tab="${tab}" aria-selected="${activeTab === tab ? "true" : "false"}">`,
        renderIcon(icon),
        `<span>${label}</span><small>${escapeHtml(badge)}</small>`,
        "</button>"
      ].join("");
    }),
    "</nav>"
  ].join("");
}

/**
 * Renders a compact snapshot status line.
 *
 * @param snapshot - Snapshot to summarize.
 * @returns Human-readable status line.
 */
function renderSnapshotLine(snapshot: QuireDevtoolsSnapshot): string {
  return snapshot.attached
    ? `Attached / Doc ${snapshot.docSize} / Text ${snapshot.textLength}`
    : "Detached / Doc 0 / Text 0";
}
