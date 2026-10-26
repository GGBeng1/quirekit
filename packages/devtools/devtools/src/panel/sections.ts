import { formatDuration, formatJson } from "./format";
import { renderIcon } from "./icons";
import {
  formatDisplayCommandCacheCounter,
  formatLayeredCacheCounter,
  formatMeasuredSourceCacheCounter,
  formatPaginationCheckpointStoreCounter,
  formatTextblockTailReuseCounter
} from "./cache";
import { countJsonMatches, renderJsonTree } from "./json";
import { renderKeyValue, renderSection } from "./section";
import type { QuireDevtoolsPanelRenderOptions } from "./types";
import type {
  QuireDevtoolsEntry,
  QuireDevtoolsRenderSummary,
  QuireDevtoolsSnapshot
} from "../types";

/**
 * Renders compact metrics for the current editor state.
 *
 * @param snapshot - Snapshot to summarize.
 * @param entries - Recent performance entries.
 * @returns HTML string for overview metrics.
 */
export function renderOverview(
  snapshot: QuireDevtoolsSnapshot,
  entries: readonly QuireDevtoolsEntry[]
): string {
  const slowCount = entries.filter((entry) => entry.slow).length;
  const latestEntry = entries.at(-1);
  const interactionCount = entries.filter((entry) => entry.kind === "interaction").length;
  const stats = [
    ["Doc", String(snapshot.docSize)],
    ["Text", String(snapshot.textLength)],
    ["Entries", String(entries.length)],
    ["Traces", String(interactionCount)],
    ["Slow", String(slowCount)],
    [
      "Last",
      latestEntry
        ? latestEntry.measured
          ? formatDuration(latestEntry.durationMs)
          : "observed"
        : "none"
    ]
  ] as const;

  return [
    "<section class=\"qk-devtools-metrics\" aria-label=\"Current devtools summary\">",
    ...stats.map(([label, value]) => {
      return [
        "<div class=\"qk-devtools-metric\">",
        `<span>${label}</span>`,
        `<strong>${value}</strong>`,
        "</div>"
      ].join("");
    }),
    "</section>"
  ].join("");
}

/**
 * Renders the document JSON inspector page.
 *
 * @param snapshot - Snapshot that may include document JSON.
 * @param options - Panel render options.
 * @returns HTML string for the document page.
 */
export function renderDocumentPage(
  snapshot: QuireDevtoolsSnapshot,
  options: QuireDevtoolsPanelRenderOptions
): string {
  const document = snapshot.document ?? null;
  const json = formatJson(document);
  const search = options.jsonSearch ?? "";
  const matchCount = countJsonMatches(document, search);
  const copyText = options.copyState === "copied"
    ? "Copied"
    : options.copyState === "failed"
      ? "Copy failed"
      : "Copy";

  return [
    "<section class=\"qk-devtools-page qk-devtools-page--document\">",
    "<header class=\"qk-devtools-page__head\">",
    "<div><h3>Document JSON</h3><p>Schema-shaped editor state</p></div>",
    "<div class=\"qk-devtools-page__actions\">",
    `<button type="button" data-qk-devtools-action="json-expand-all">${renderIcon("maximize")}<span>Expand all</span></button>`,
    `<button type="button" data-qk-devtools-action="json-collapse-all">${renderIcon("minimize")}<span>Collapse all</span></button>`,
    `<button type="button" data-qk-devtools-action="json-copy">${renderIcon("copy")}<span>${copyText}</span></button>`,
    "</div>",
    "</header>",
    "<div class=\"qk-devtools-json-toolbar\">",
    "<div class=\"qk-devtools-json-toolbar__search\">",
    renderIcon("search"),
    `<input data-qk-devtools-json-search type="search" placeholder="Search JSON" value="${escapeInputValue(search)}" spellcheck="false" />`,
    "</div>",
    `<span>${search.trim() ? `${matchCount} matches` : `${json.length} chars`}</span>`,
    "</div>",
    renderJsonTree(document, options.jsonExpandedPaths ?? ["$"], search),
    "</section>"
  ].join("");
}

/**
 * Renders schema and runtime state details.
 *
 * @param snapshot - Snapshot containing schema information.
 * @returns HTML string for the state page.
 */
export function renderStatePage(snapshot: QuireDevtoolsSnapshot): string {
  const schema = snapshot.schema;

  return [
    "<section class=\"qk-devtools-page\">",
    "<header class=\"qk-devtools-page__head\"><div><h3>Editor State</h3><p>Selection, schema, extensions</p></div></header>",
    "<div class=\"qk-devtools-card-grid\">",
    renderSection("Selection", [
      renderKeyValue("From", String(snapshot.selection?.from ?? 0)),
      renderKeyValue("To", String(snapshot.selection?.to ?? 0)),
      renderKeyValue("Empty", String(snapshot.selection?.empty ?? true)),
      renderKeyValue("Anchor", String(snapshot.selection?.anchor ?? 0)),
      renderKeyValue("Head", String(snapshot.selection?.head ?? 0))
    ]),
    renderSection("Schema", [
      renderKeyValue("Top", schema?.topNode ?? "none"),
      renderKeyValue("Nodes", schema?.nodes.join(", ") ?? ""),
      renderKeyValue("Marks", schema?.marks.join(", ") || "none")
    ]),
    renderSection("Runtime", [
      renderKeyValue("Extensions", snapshot.extensionNames.join(", ")),
      renderKeyValue("Plugins", snapshot.pluginKeys.join(", ")),
      renderKeyValue("Storage", snapshot.storageKeys.join(", "))
    ], "qk-devtools__section--wide"),
    "</div>",
    "</section>"
  ].join("");
}

/**
 * Renders latest render metrics.
 *
 * @param render - Latest render summary, when present.
 * @returns HTML string for the render page.
 */
export function renderRenderPage(
  render: QuireDevtoolsRenderSummary | undefined
): string {
  if (!render) {
    return [
      "<section class=\"qk-devtools-page\">",
      "<header class=\"qk-devtools-page__head\"><div><h3>Render</h3><p>No render captured yet</p></div></header>",
      "<p class=\"qk-devtools-empty\">No render captured yet.</p>",
      "</section>"
    ].join("");
  }

  const cacheCounters = render.cacheCounterDelta ?? render.cacheCounters;

  return [
    "<section class=\"qk-devtools-page\">",
    "<header class=\"qk-devtools-page__head\"><div><h3>Render</h3><p>Latest mounted view pass</p></div></header>",
    "<div class=\"qk-devtools-card-grid\">",
    renderSection("Pass", [
      renderKeyValue("View", render.viewId),
      renderKeyValue("Mode", render.mode),
      renderKeyValue("Reason", render.reason ?? "none"),
      renderKeyValue("Strategy", render.strategy ?? "render")
    ]),
    renderSection("Counts", [
      renderKeyValue("Commands", String(render.commandCount)),
      renderKeyValue("Blocks", String(render.blockCount)),
      renderKeyValue("Carets", String(render.caretCount)),
      renderKeyValue("Ranges", String(render.selectionRangeCount)),
      renderKeyValue("Overlays", String(render.overlayCount))
    ]),
    renderSection("Geometry", [
      renderKeyValue("Surface", `${render.displayWidth}x${render.displayHeight}`),
      renderKeyValue("DPR", String(render.devicePixelRatio ?? 1)),
      renderKeyValue("Document", formatRect(render.documentRect)),
      renderKeyValue("Viewport", formatRect(render.viewportRect))
    ], "qk-devtools__section--wide"),
    cacheCounters
      ? renderSection(render.cacheCounterDelta ? "Cache Delta" : "Cache", [
          renderKeyValue(
            "Retained blocks",
            `${cacheCounters.retainedBlock.reusedRecords} reused / ` +
              `${cacheCounters.retainedBlock.rebuiltRecords} rebuilt / ` +
              `${cacheCounters.retainedBlock.projectedRecords} projected / ` +
              `${cacheCounters.retainedBlock.heightIndexRebuilds} index rebuilds / ` +
              `${cacheCounters.retainedBlock.heightIndexDeltaBatches} delta batches`
          ),
          renderKeyValue(
            "Block shape",
            formatLayeredCacheCounter([
              [
                "frag",
                cacheCounters.blockShape.fragmentHits,
                cacheCounters.blockShape.fragmentMisses,
                cacheCounters.blockShape.fragmentStores
              ],
              [
                "input",
                cacheCounters.blockShape.inputHits,
                cacheCounters.blockShape.inputMisses,
                cacheCounters.blockShape.inputStores
              ],
              [
                "top",
                cacheCounters.blockShape.topLevelInputExactHits +
                  cacheCounters.blockShape.topLevelInputShiftHits,
                cacheCounters.blockShape.topLevelInputMisses,
                cacheCounters.blockShape.topLevelInputStores
              ],
              [
                "local",
                cacheCounters.blockShape.localShapeHits,
                cacheCounters.blockShape.localShapeMisses,
                cacheCounters.blockShape.localShapeStores
              ],
            ])
          ),
          renderKeyValue(
            "Textblock tail",
            formatTextblockTailReuseCounter(cacheCounters.blockShape)
          ),
          renderKeyValue(
            "Measured source",
            formatMeasuredSourceCacheCounter(cacheCounters.measuredSource)
          ),
          renderKeyValue(
            "Pagination checkpoints",
            formatPaginationCheckpointStoreCounter(cacheCounters.paginationCheckpoint)
          ),
          renderKeyValue(
            "Display commands",
            formatDisplayCommandCacheCounter(cacheCounters.displayCommand)
          )
        ], "qk-devtools__section--wide")
      : "",
    render.displayChunkCounters
      ? renderSection("Display Chunks", [
          renderKeyValue(
            "Page",
            formatDisplayChunkCategoryCounter(render.displayChunkCounters.page)
          ),
          renderKeyValue(
            "Sub-layout",
            formatDisplayChunkCategoryCounter(render.displayChunkCounters.subLayout)
          )
        ], "qk-devtools__section--wide")
      : "",
    render.displayOwnerDiagnostics
      ? renderSection("Display Owners", [
      renderKeyValue(
        "Compiled",
        `${render.displayOwnerDiagnostics.compiledOwners} owners | ` +
        `${render.displayOwnerDiagnostics.directOwnerChunks} chunks`
      ),
      renderKeyValue(
        "Lanes",
        `${render.displayOwnerDiagnostics.contentOwners} content | ` +
        `${render.displayOwnerDiagnostics.overlayOwners} overlay`
      ),
      renderKeyValue(
        "Projection",
        `${render.displayOwnerDiagnostics.rebuiltOwners} rebuilt | ` +
        `${render.displayOwnerDiagnostics.reusedOwners} reused`
      ),
      renderKeyValue(
        "Escalation",
        render.displayOwnerDiagnostics.escalationCodes.join(", ") || "none"
      ),
      renderKeyValue(
        "Gaps / bridge",
        `${render.displayOwnerDiagnostics.gapCodes.join(", ") || "none"} | ` +
        `observer ${render.displayOwnerDiagnostics.observerBridgeUses}`
      )
        ], "qk-devtools__section--wide")
      : "",
    "</div>",
    "</section>"
  ].join("");
}

/**
 * Formats retained display chunk production counters.
 *
 * @param counter - Display chunk category counters.
 * @returns Compact retained/migration/fallback counter text.
 */
function formatDisplayChunkCategoryCounter(
  counter: NonNullable<QuireDevtoolsRenderSummary["displayChunkCounters"]>["page"]
): string {
  return [
    `retained ${counter.retainedChunks}/${counter.retainedRecords}`,
    `fallback ${counter.fullFallbacks}`
  ].join(" | ");
}

/**
 * Escapes an input value.
 *
 * @param value - Raw input value.
 * @returns Escaped input value.
 */
function escapeInputValue(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;");
}

/**
 * Formats a render rectangle.
 *
 * @param rect - Rectangle to format.
 * @returns Compact rectangle label.
 */
function formatRect(rect: QuireDevtoolsRenderSummary["documentRect"]): string {
  return `${rect.x},${rect.y} ${rect.width}x${rect.height}`;
}
