import { selectParentNode as pmSelectParentNode } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Selects the parent node of the current selection.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror selected a parent node.
 */
export const selectParentNode: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmSelectParentNode);
