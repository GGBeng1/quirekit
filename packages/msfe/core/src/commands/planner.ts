import type { MsfeCommand } from "../state/types";
import type { Command } from "./types";

/**
 * Adapts an existing pure CodeMirror planner into the same author-command transaction.
 * @param planner - Backend source planner.
 * @returns Curried command body suitable for addCommands or chain.command.
 */
export function sourceCommand(planner: MsfeCommand): Command {
  return ({ state, tr }) => { const spec = planner(state); return spec !== null && tr.apply(spec); };
}
