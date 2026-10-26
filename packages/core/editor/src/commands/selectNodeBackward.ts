import { selectNodeBackward as pmSelectNodeBackward } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Selects the node before the current cursor.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror selected the previous node.
 */
export const selectNodeBackward: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmSelectNodeBackward);
