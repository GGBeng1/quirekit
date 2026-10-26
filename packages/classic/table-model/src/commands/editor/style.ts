import { defineCommand, type AnyCommands, type CommandSpec } from "@quirekit/core";
import type { Node as PMNode } from "@quirekit/pm";
import {
  applyWordTableStyleToNode,
  ensureWordTableStyleAvailable,
  resolveWordTableStyleRegistry,
  setWordTableLookOnNode,
  type ApplyWordTableStyleOptions,
  type SetWordTableLookOptions
} from "../../style";
import { withSelectedTablePosition } from "../derive/editor/selection/options";
import { createTableTransformCommand } from "../derive/editor/transform";
import { wordTableCommandSuccess, type WordTableCommandResult } from "../types";
import type {
  ApplyWordTableStyleCommandOptions,
  SetWordTableLookCommandOptions
} from "./types";

/** Table style look switches, as Agents name them. */
const lookSwitches = ["firstRow", "lastRow", "firstColumn", "lastColumn", "bandedRows", "bandedColumns"] as const;

/**
 * Creates editor commands for table styles and look switches.
 *
 * @returns Editor command map.
 */
export function createWordTableStyleEditorCommands(): AnyCommands {
  const applyToTable = createTableTransformCommand<ApplyWordTableStyleCommandOptions>(
    (tableNode, options) => success(applyWordTableStyleToNode(tableNode, options)),
    withSelectedTablePosition,
    { preserveSelectionWithinTable: true }
  );
  const applyWordTableStyle: CommandSpec = (options) => (context) => {
    const request = options as ApplyWordTableStyleOptions | undefined;
    if (request === undefined || typeof request.styleId !== "string") return false;
    const registry = resolveWordTableStyleRegistry(context.state.doc.attrs.wordTableStyleRegistry);
    const available = ensureWordTableStyleAvailable(registry, request.styleId);
    if (available === null || !applyToTable(options)(context)) return false;
    // Install a built-in definition in the same transaction as its first use.
    if (available !== registry) context.tr.setDocAttribute("wordTableStyleRegistry", available);
    return true;
  };
  return {
    applyWordTableStyle: defineCommand({
      description: "Applies a table style to the table: TableGrid (single-line grid), QuireThreeLineTable (三线表 for theses and reports: top, header and bottom rules only), TableNormal (no borders), or a style the document defines. By default it clears direct formatting that conflicts with the style, as Word's gallery does.",
      target: "block",
      nodes: ["wordTable"],
      params: {
        type: "object",
        required: ["styleId"],
        properties: {
          styleId: { type: "string", minLength: 1, description: "Style id: TableGrid, QuireThreeLineTable, TableNormal, or a table style id of the document." },
          mode: { enum: ["clear-direct-formatting", "keep-direct-formatting"], description: "Default clear-direct-formatting." },
          look: {
            type: "object",
            description: "Which parts the style emphasizes; omitted switches keep their value.",
            properties: Object.fromEntries(lookSwitches.map(name => [name, { type: "boolean" }])),
            additionalProperties: false
          }
        },
        additionalProperties: false
      },
      run: applyWordTableStyle
    }),
    setWordTableLook: defineCommand({
      description: "Switches which parts of the table its style emphasizes (header row, total row, first or last column, banded rows or columns), as Word's Table Style Options do; it has a visible effect only when the table style formats those parts.",
      target: "block",
      nodes: ["wordTable"],
      params: {
        type: "object",
        required: ["look"],
        properties: {
          look: {
            type: "object",
            description: "Switches to change; omitted switches keep their value.",
            minProperties: 1,
            properties: Object.fromEntries(lookSwitches.map(name => [name, { type: "boolean" }])),
            additionalProperties: false
          }
        },
        additionalProperties: false
      },
      run: createTableTransformCommand<SetWordTableLookCommandOptions>(
        (tableNode, options: SetWordTableLookOptions) => success(setWordTableLookOnNode(tableNode, options)),
        withSelectedTablePosition,
        { preserveSelectionWithinTable: true }
      )
    })
  };
}

/**
 * Wraps a replacement node as a successful table command result.
 *
 * @param node - Replacement table node.
 * @returns Successful result.
 */
function success(node: PMNode): WordTableCommandResult<PMNode> {
  return wordTableCommandSuccess(node);
}
