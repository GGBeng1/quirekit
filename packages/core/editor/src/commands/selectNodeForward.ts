import { selectNodeForward as pmSelectNodeForward } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Selects the node after the current cursor.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror selected the next node.
 */
export const selectNodeForward: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmSelectNodeForward);
