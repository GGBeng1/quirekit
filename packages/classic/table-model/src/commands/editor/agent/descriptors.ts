import { defineCommand, type AnyCommands, type CommandSpec, type QuireCommandAgentContext } from "@quirekit/core";
import type { WordTableCellMargins } from "../../../types";
import { ordinalSchema, pointsSchema, rectProperties, rectRequired, rowHeightSchema, sideSchema } from "./schemas";
import {
  toWordTableBorder,
  toWordTablePointWidth,
  toWordTableRowHeight,
  toWordTableWidth,
  withWordTableDefaultMargin,
  type WordTableAgentBorderStyle,
  type WordTableAgentRowHeight,
  type WordTableAgentWidth
} from "./values";

/** Cell rectangle as Agents write it, counted from 1. */
interface Rect {
  /** First row. */
  readonly startRow: number;
  /** First column. */
  readonly startColumn: number;
  /** Number of rows. */
  readonly rowSpan: number;
  /** Number of columns. */
  readonly columnSpan: number;
}

/**
 * Describes one table command: it acts on the table whose block id the call names, with rows and columns
 * counted from 1 as the view captions them.
 * @param run - Table command.
 * @param description - What it does.
 * @param params - Agent parameters.
 * @param adapt - Turns parameters and the table position into command options.
 * @returns Described command.
 */
function describe(
  run: CommandSpec,
  description: string,
  params: Readonly<Record<string, unknown>>,
  adapt: (value: never, tablePos: number, context: QuireCommandAgentContext) => unknown
): CommandSpec {
  return defineCommand({
    description,
    category: "表格",
    target: "block",
    nodes: ["wordTable"],
    params,
    adapt: (value, context) => context.pos === null ? null : adapt(value as never, context.pos, context),
    run
  });
}

/** @param value - Rectangle counted from 1. @param tablePos - Table position. @returns Command rectangle. */
function rect(value: Rect, tablePos: number): { tablePos: number; startRow: number; startColumn: number; rowSpan: number; columnSpan: number } {
  return { tablePos, startRow: value.startRow - 1, startColumn: value.startColumn - 1, rowSpan: value.rowSpan, columnSpan: value.columnSpan };
}

/** @param properties - Extra properties. @param required - Extra required names. @returns Object schema over a cell rectangle. */
function rectSchema(properties: Readonly<Record<string, unknown>>, required: readonly string[] = []): Readonly<Record<string, unknown>> {
  return { type: "object", required: [...rectRequired, ...required], properties: { ...rectProperties, ...properties }, additionalProperties: false };
}

/**
 * Adds Agent descriptions to the table structure and formatting commands.
 * @param commands - Table command map.
 * @returns The same map with described commands.
 */
export function describeWordTableCommands(commands: AnyCommands): AnyCommands {
  return {
    ...commands,
    addWordTableRow: describe(commands.addWordTableRow!, "Adds an empty row before or after row `rowIndex` of the table.",
      { type: "object", required: ["rowIndex", "side"], properties: { rowIndex: ordinalSchema, side: { enum: ["before", "after"] } }, additionalProperties: false },
      (value: { rowIndex: number; side: string }, tablePos) => ({ tablePos, rowIndex: value.rowIndex - 1, side: value.side, copyRowShape: false, repair: "never" })),
    addWordTableRows: describe(commands.addWordTableRows!, "Adds `count` empty rows before or after row `rowIndex` of the table.",
      { type: "object", required: ["rowIndex", "side", "count"], properties: { rowIndex: ordinalSchema, side: { enum: ["before", "after"] }, count: { type: "integer", minimum: 1, maximum: 100 } }, additionalProperties: false },
      (value: { rowIndex: number; side: string; count: number }, tablePos) => ({ tablePos, rowIndex: value.rowIndex - 1, side: value.side, count: value.count, copyRowShape: false, repair: "never" })),
    addWordTableColumns: describe(commands.addWordTableColumns!, "Adds `count` empty columns before or after column `columnIndex` of the table.",
      { type: "object", required: ["columnIndex", "side", "count"], properties: { columnIndex: ordinalSchema, side: { enum: ["before", "after"] }, count: { type: "integer", minimum: 1, maximum: 30 } }, additionalProperties: false },
      (value: { columnIndex: number; side: string; count: number }, tablePos) => ({ tablePos, columnIndex: value.columnIndex - 1, side: value.side, count: value.count, repair: "never" })),
    deleteWordTableRows: describe(commands.deleteWordTableRows!, "Deletes row `rowIndex` of the table.",
      { type: "object", required: ["rowIndex"], properties: { rowIndex: ordinalSchema }, additionalProperties: false },
      (value: { rowIndex: number }, tablePos) => ({ tablePos, from: value.rowIndex - 1, repair: "never" })),
    addWordTableColumn: describe(commands.addWordTableColumn!, "Adds an empty column before or after column `columnIndex` of the table.",
      { type: "object", required: ["columnIndex", "side"], properties: { columnIndex: ordinalSchema, side: { enum: ["before", "after"] } }, additionalProperties: false },
      (value: { columnIndex: number; side: string }, tablePos) => ({ tablePos, columnIndex: value.columnIndex - 1, side: value.side, repair: "never" })),
    deleteWordTableColumns: describe(commands.deleteWordTableColumns!, "Deletes column `columnIndex` of the table.",
      { type: "object", required: ["columnIndex"], properties: { columnIndex: ordinalSchema }, additionalProperties: false },
      (value: { columnIndex: number }, tablePos) => ({ tablePos, from: value.columnIndex - 1, repair: "never" })),
    mergeWordTableCells: describe(commands.mergeWordTableCells!, "Merges a rectangle of cells into one.",
      rectSchema({}), (value: Rect, tablePos) => ({ ...rect(value, tablePos), repair: "never" })),
    splitWordTableCell: describe(commands.splitWordTableCell!, "Splits cell (`rowIndex`,`columnIndex`) into `rowCount` rows and `columnCount` columns.",
      {
        type: "object", required: ["rowIndex", "columnIndex", "rowCount", "columnCount"], additionalProperties: false,
        properties: { rowIndex: ordinalSchema, columnIndex: ordinalSchema, rowCount: { type: "integer", minimum: 1, maximum: 32 }, columnCount: { type: "integer", minimum: 1, maximum: 32 } }
      },
      (value: { rowIndex: number; columnIndex: number; rowCount: number; columnCount: number }, tablePos) =>
        ({ tablePos, rowIndex: value.rowIndex - 1, columnIndex: value.columnIndex - 1, rowCount: value.rowCount, columnCount: value.columnCount, repair: "never" })),
    setWordTableAttrs: describe(commands.setWordTableAttrs!, "Sets table properties: preferred width, indent in points, alignment on the page, fixed or autofit layout, or a default cell margin side in points; null clears a value.",
      {
        type: "object", minProperties: 1, additionalProperties: false,
        properties: {
          width: { anyOf: [{ type: "object", required: ["unit", "value"], additionalProperties: false, properties: { unit: { enum: ["points", "percent"] }, value: { type: "number", minimum: 1, maximum: 1584 } } }, { type: "null" }] },
          indent: pointsSchema(-1584, 1584),
          alignment: { enum: ["left", "center", "right", null] },
          layout: { enum: ["autofit", "fixed", null] },
          defaultCellMargin: { type: "object", required: ["side", "points"], additionalProperties: false, properties: { side: sideSchema, points: pointsSchema(0, 144) } }
        }
      },
      (value: { width?: WordTableAgentWidth | null; indent?: number | null; alignment?: string | null; layout?: string | null; defaultCellMargin?: { side: keyof WordTableCellMargins; points: number | null } }, tablePos, { doc }) => ({
        tablePos,
        attrs: {
          ...(value.width === undefined ? {} : { width: toWordTableWidth(value.width) }),
          ...(value.indent === undefined ? {} : { tableIndent: toWordTablePointWidth(value.indent) }),
          ...(value.alignment === undefined ? {} : { alignment: value.alignment }),
          ...(value.layout === undefined ? {} : { tableLayout: value.layout }),
          ...(value.defaultCellMargin === undefined ? {} : {
            defaultCellMargins: withWordTableDefaultMargin(doc, tablePos, value.defaultCellMargin.side, value.defaultCellMargin.points)
          })
        }
      })),
    setWordTableColumnWidth: describe(commands.setWordTableColumnWidth!, "Sets the width of column `columnIndex` in points; null clears it.",
      { type: "object", required: ["columnIndex", "points"], properties: { columnIndex: ordinalSchema, points: pointsSchema(1, 1584) }, additionalProperties: false },
      (value: { columnIndex: number; points: number | null }, tablePos) => ({ tablePos, columnIndex: value.columnIndex - 1, width: toWordTablePointWidth(value.points) })),
    setWordTableRowHeight: describe(commands.setWordTableRowHeight!, "Sets the height of row `rowIndex` (at least or exactly, in points); null clears it.",
      { type: "object", required: ["rowIndex", "value"], properties: { rowIndex: ordinalSchema, value: rowHeightSchema }, additionalProperties: false },
      (value: { rowIndex: number; value: WordTableAgentRowHeight | null }, tablePos) => ({ tablePos, rowIndex: value.rowIndex - 1, height: toWordTableRowHeight(value.value) })),
    distributeWordTableColumns: describe(commands.distributeWordTableColumns!, "Makes columns `from` to `to` equally wide, optionally sharing `totalPoints`.",
      { type: "object", required: ["from", "to"], properties: { from: ordinalSchema, to: ordinalSchema, totalPoints: pointsSchema(1, 1584) }, additionalProperties: false },
      (value: { from: number; to: number; totalPoints?: number | null }, tablePos) => ({
        tablePos, from: value.from - 1, to: value.to - 1, repair: "never",
        ...(value.totalPoints === undefined || value.totalPoints === null ? {} : { totalWidth: toWordTablePointWidth(value.totalPoints) })
      })),
    distributeWordTableRows: describe(commands.distributeWordTableRows!, "Makes rows `from` to `to` equally high, optionally sharing `total`.",
      { type: "object", required: ["from", "to"], properties: { from: ordinalSchema, to: ordinalSchema, total: rowHeightSchema }, additionalProperties: false },
      (value: { from: number; to: number; total?: WordTableAgentRowHeight | null }, tablePos) => ({
        tablePos, from: value.from - 1, to: value.to - 1,
        ...(value.total === undefined || value.total === null ? {} : { totalHeight: toWordTableRowHeight(value.total) })
      })),
    setWordTableCellMargin: describe(commands.setWordTableCellMargin!, "Sets one margin side, in points, of a rectangle of cells; null clears it.",
      rectSchema({ side: sideSchema, points: pointsSchema(0, 144) }, ["side", "points"]),
      (value: Rect & { side: string; points: number | null }, tablePos) => ({ ...rect(value, tablePos), side: value.side, margin: toWordTablePointWidth(value.points), repair: "never" })),
    setWordTableCellAttrs: describe(commands.setWordTableCellAttrs!, "Sets properties of a rectangle of cells: background `fill` \"#RRGGBB\", vertical alignment, no wrapping or text direction; null clears a value.",
      rectSchema({
        fill: { anyOf: [{ type: "string", pattern: "^#[0-9A-Fa-f]{6}$" }, { type: "null" }] },
        verticalAlign: { enum: ["top", "center", "bottom", null] },
        noWrap: { anyOf: [{ type: "boolean" }, { type: "null" }] },
        textDirection: { enum: ["lrTb", "tbRl", "btLr", "lrTbV", "tbRlV", null] }
      }),
      (value: Rect & { fill?: string | null; verticalAlign?: string | null; noWrap?: boolean | null; textDirection?: string | null }, tablePos) => {
        const attrs = {
          ...(value.fill === undefined ? {} : {
            shading: value.fill === null ? null : { fill: value.fill.slice(1).toUpperCase(), color: null, pattern: "clear" }, backgroundColor: null
          }),
          ...(value.verticalAlign === undefined ? {} : { verticalAlign: value.verticalAlign }),
          ...(value.noWrap === undefined ? {} : { noWrap: value.noWrap }),
          ...(value.textDirection === undefined ? {} : { textDirection: value.textDirection })
        };
        return Object.keys(attrs).length === 0 ? null : { ...rect(value, tablePos), repair: "never", attrs };
      }),
    setWordTableRowAttrs: describe(commands.setWordTableRowAttrs!, "Marks row `rowIndex` as a header row repeated on each page, or keeps it from breaking across pages.",
      { type: "object", required: ["rowIndex"], minProperties: 2, properties: { rowIndex: ordinalSchema, header: { type: "boolean" }, cantSplit: { type: "boolean" } }, additionalProperties: false },
      (value: { rowIndex: number; header?: boolean; cantSplit?: boolean }, tablePos) => ({
        tablePos, rowIndex: value.rowIndex - 1,
        attrs: { ...(value.header === undefined ? {} : { isHeader: value.header }), ...(value.cantSplit === undefined ? {} : { cantSplit: value.cantSplit }) }
      })),
    setWordTableCellBorders: describe(commands.setWordTableCellBorders!, "Sets the borders of a rectangle of cells: which edges (`preset` none, all, outside, inside or one side) and their look (`border` none, thin-black, thin-accent or thin-red). preset none removes every border.",
      rectSchema({ preset: { enum: ["none", "all", "outside", "inside", "top", "right", "bottom", "left"] }, border: { enum: ["none", "thin-black", "thin-accent", "thin-red"] } }, ["preset", "border"]),
      (value: Rect & { preset: string; border: WordTableAgentBorderStyle }, tablePos) => ({ ...rect(value, tablePos), repair: "never", preset: value.preset, border: toWordTableBorder(value.border) })),
    setWordTableCellBorderFormat: describe(commands.setWordTableCellBorderFormat!, "Changes the visible borders of a rectangle of cells: line `style`, `width` in points and `color` \"#RRGGBB\"; borders that are off stay off (turn edges on with setWordTableCellBorders).",
      rectSchema({
        style: { enum: ["single", "double", "dotted", "dashed"] },
        width: { type: "number", minimum: 0.25, maximum: 12 },
        color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" }
      }),
      (value: Rect & { style?: string; width?: number; color?: string }, tablePos) => {
        const format = {
          ...(value.style === undefined ? {} : { style: value.style }),
          ...(value.width === undefined ? {} : { size: Math.min(96, Math.max(2, Math.round(value.width * 8))) }),
          ...(value.color === undefined ? {} : { color: value.color.slice(1).toUpperCase() })
        };
        return Object.keys(format).length === 0 ? null : { ...rect(value, tablePos), repair: "never", format };
      }),
    clearWordTableCellFormatting: describe(commands.clearWordTableCellFormatting!, "Clears the direct formatting of a rectangle of cells.",
      rectSchema({}), (value: Rect, tablePos) => rect(value, tablePos))
  };
}
