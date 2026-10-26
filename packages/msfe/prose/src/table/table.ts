import { Node, defineSource, sourceCommand } from "@quirekit/msfe-core";
import { EditorView } from "@quirekit/cm-view";
import { projectTable } from "./projection";
import { insertTableRow, deleteTableRow, insertTableColumn, deleteTableColumn, moveTableCell } from "./commands";
import { tablePlaceholderEvents } from "./events";
import { tableLayout } from "./layout/runtime";
import { TABLE_SCROLL_ATTRIBUTE } from "./layout/scroll";
import { tableReading } from "./reading/extension";
import { setTableColumnAlignment } from "./alignment";

/** GFM table presentation keeps the canonical editor as the only text and selection owner. */
export const Table = Node.create<Record<string, never>>({ name: "table",
  priority: 110,
  /** @returns Atomic table source planners; read-only/composition/target checks remain central. */
  addCommands: () => ({ setTableColumnAlignment: alignment => sourceCommand(setTableColumnAlignment(alignment)),
    insertTableRow: (side = "after") => sourceCommand(insertTableRow(side)), deleteTableRow: () => sourceCommand(deleteTableRow()),
    insertTableColumn: (side = "after") => sourceCommand(insertTableColumn(side)), deleteTableColumn: () => sourceCommand(deleteTableColumn()),
    moveTableCell: (direction = 1) => sourceCommand(moveTableCell(direction)) }),
  /** @returns Cell navigation with CM's native Escape-Tab focus escape. */
  addKeyboardShortcuts() { return { Tab: () => this.editor.commands.moveTableCell(1), "Shift-Tab": () => this.editor.commands.moveTableCell(-1) }; },
  /** @returns Confirmed table semantics, with structure commands intentionally separate. */
  addSource: () => defineSource({ nodes: ["Table"], read: () => ({}), patch: () => null }),
  /** @returns Viewport-bounded native table rows and cells. */
  addProjections() { return [{ nodes: ["Table"], outer: true, decorate: projectTable }]; },
  /** @returns Usable neutral geometry for standalone consumers. */
  addCodeMirrorExtensions() { return [tablePlaceholderEvents(() => this.editor), tableLayout, tableReading, EditorView.baseTheme({
    ".msfe-table-row": { display: "flex", alignItems: "stretch", whiteSpace: "pre", overflowWrap: "normal", minWidth: "0", overflowX: "auto", scrollbarWidth: "none", overscrollBehaviorX: "contain" },
    ".msfe-table-last": { scrollbarWidth: "thin" },
    // A host wrapper scrolls and overscrolls the whole table; its rows only overflow into it.
    [`[${TABLE_SCROLL_ATTRIBUTE}]`]: { overflowX: "auto", overscrollBehaviorX: "contain", scrollbarWidth: "thin" },
    [`[${TABLE_SCROLL_ATTRIBUTE}] > .msfe-table-row`]: { overflowX: "visible" },
    ".msfe-table-cell": { display: "inline-block", flexShrink: "0", boxSizing: "border-box",
      width: "calc(100% / var(--msfe-table-columns))",
      minWidth: "0", whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
    // Product adapters may opt into a public semantic stylesheet without losing the measured grid.
    ".msfe-table-cell:where(:not([data-qk-prose]))": { border: "1px solid #8095a040", padding: "8px 12px" },
    // Cells are spans, so emulate border-collapse: only the first cell keeps its start edge
    // and only the header row its top edge. Border-box widths keep column origins unchanged.
    ".msfe-table-cell ~ .msfe-table-cell": { borderInlineStartWidth: "0" },
    ".msfe-table-row:not(.msfe-table-header) .msfe-table-cell": { borderBlockStartWidth: "0" },
    ".msfe-table-header": { fontWeight: "600" },
    ".msfe-table-pipe": { display: "inline-block", flexShrink: "0", width: "0", color: "transparent" },
    ".msfe-table-delimiter-cell": { display: "inline-block", boxSizing: "border-box", width: "calc(100% / var(--msfe-table-columns))",
      flexShrink: "0", paddingInline: "12px", borderInline: "1px solid #8095a040", minWidth: "0", whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
    ".msfe-table-separator": { color: "transparent", fontSize: ".8em", lineHeight: "1.5" },
    ".msfe-table-separator span": { color: "inherit" },
    ".msfe-table-surplus": { color: "inherit", whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
    ".msfe-table-active .msfe-table-pipe, .msfe-table-separator.msfe-table-active": { color: "inherit" },
  })]; },
});
