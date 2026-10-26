import {
  renderLauncher,
  renderRail,
  renderTopbar
} from "./chrome";
import { defaultExportTopCount, normalizeExportTopCount } from "./export";
import { renderPanelOffsetStyle } from "./mount/offset";
import {
  renderPerformancePage
} from "./timeline/entries";
import { renderInteractionsPage } from "./timeline/interactions";
import {
  collectDefaultJsonExpandedPaths
} from "./json";
import {
  renderDocumentPage,
  renderOverview,
  renderRenderPage,
  renderStatePage
} from "./sections";
import { renderPanelStyles } from "./style";
import type {
  QuireDevtoolsPanelRenderOptions,
  QuireDevtoolsPanelTab
} from "./types";
import type {
  QuireDevtools,
  QuireDevtoolsEntry,
  QuireDevtoolsSnapshot
} from "../types";

/**
 * Renders the framework-neutral QuireKit devtools panel as HTML.
 *
 * @param devtools - Devtools instance to read from.
 * @param options - Rendering options for dock state.
 * @returns HTML string for the current panel state.
 */
export function renderQuireDevtoolsPanelHtml(
  devtools: Pick<QuireDevtools, "getEntries" | "getSnapshot">,
  options: QuireDevtoolsPanelRenderOptions = {}
): string {
  const open = options.open === true;
  const entries = devtools.getEntries();

  // A closed launcher must not serialize the document or build hidden panel
  // DOM on the editor's input path. The full snapshot is read only when the
  // user asks to inspect it.
  if (!open) {
    return [
      renderPanelStyles(),
      `<div class="qk-devtools-root" data-open="false" data-fullscreen="false" data-tab="${options.activeTab ?? "document"}">`,
      renderLauncher(entries, false),
      '<div class="qk-devtools-shell" aria-hidden="true">',
      '<section id="qk-devtools-dialog" class="qk-devtools-panel" role="complementary" aria-label="QuireKit Devtools"></section>',
      "</div>",
      "</div>"
    ].join("");
  }

  const snapshot = devtools.getSnapshot({
    includeDebugJSON: true,
    includeJSON: true
  });
  const fullscreen = options.fullscreen === true;
  const activeTab = options.activeTab ?? "document";
  const renderOptions = normalizeRenderOptions(snapshot, options, activeTab);
  const panelStyle = renderPanelStyle(renderOptions, fullscreen);

  return [
    renderPanelStyles(),
    `<div class="qk-devtools-root" data-open="${open ? "true" : "false"}" data-fullscreen="${fullscreen ? "true" : "false"}" data-tab="${activeTab}">`,
    renderLauncher(entries, open),
    `<div class="qk-devtools-shell" aria-hidden="${open ? "false" : "true"}">`,
    `<section id="qk-devtools-dialog" class="qk-devtools-panel" role="complementary" aria-label="QuireKit Devtools"${panelStyle ? ` style="${panelStyle}"` : ""}>`,
    renderTopbar(snapshot, entries, {
      exportTopCount: normalizeExportTopCount(
        renderOptions.exportTopCount ?? defaultExportTopCount
      ),
      fullscreen
    }),
    "<div class=\"qk-devtools-layout\">",
    renderRail(activeTab, snapshot, entries),
    "<main class=\"qk-devtools-workspace\">",
    renderOverview(snapshot, entries),
    renderActivePage(activeTab, snapshot, entries, renderOptions),
    "</main>",
    "</div>",
    "</section>",
    "</div>",
    "</div>"
  ].join("");
}

/**
 * Renders inline panel style from render options.
 *
 * @param options - Render options.
 * @returns Inline style content.
 */
function renderPanelStyle(
  options: QuireDevtoolsPanelRenderOptions,
  fullscreen: boolean
): string {
  return !fullscreen && options.panelOffset
    ? renderPanelOffsetStyle(options.panelOffset)
    : "";
}

/**
 * Renders the active tool page.
 *
 * @param activeTab - Active tab.
 * @param snapshot - Current snapshot.
 * @param entries - Recent entries.
 * @param options - Normalized render options.
 * @returns HTML string for the active page.
 */
function renderActivePage(
  activeTab: QuireDevtoolsPanelTab,
  snapshot: QuireDevtoolsSnapshot,
  entries: readonly QuireDevtoolsEntry[],
  options: QuireDevtoolsPanelRenderOptions
): string {
  if (activeTab === "performance") {
    return renderPerformancePage(
      entries,
      options.expandedTimelineEntryIds ?? [],
      options.timelineSlowOnly === true
    );
  }

  if (activeTab === "interactions") {
    return renderInteractionsPage(entries, options.expandedInteractionIds ?? []);
  }

  if (activeTab === "state") {
    return renderStatePage(snapshot);
  }

  if (activeTab === "render") {
    return renderRenderPage(snapshot.latestRender);
  }

  return renderDocumentPage(snapshot, options);
}

/**
 * Normalizes options needed by page renderers.
 *
 * @param snapshot - Current snapshot.
 * @param options - Input options.
 * @param activeTab - Active tab.
 * @returns Render options with defaults.
 */
function normalizeRenderOptions(
  snapshot: QuireDevtoolsSnapshot,
  options: QuireDevtoolsPanelRenderOptions,
  activeTab: QuireDevtoolsPanelTab
): QuireDevtoolsPanelRenderOptions {
  if (activeTab !== "document" || options.jsonExpandedPaths) {
    return options;
  }

  return {
    ...options,
    jsonExpandedPaths: collectDefaultJsonExpandedPaths(snapshot.document ?? null)
  };
}
