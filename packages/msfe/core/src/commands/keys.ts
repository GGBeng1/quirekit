import type { KeyBinding } from "@quirekit/cm-view";
import { compositionField } from "../state/fields";
import type { MsfeCommand } from "../state/types";
import { buildCommandTransaction } from "./transaction";

/**
 * Routes feature shortcuts through the same atomic planner as public toolbar commands.
 * @param key - CodeMirror platform-neutral key description.
 * @param command - Pure source command.
 * @returns Key binding with shared readonly, composition and history semantics.
 */
export function commandKeyBinding(key: string, command: MsfeCommand): KeyBinding {
  return { key, preventDefault: true, run: view => {
    if (view.state.field(compositionField, false)) return false;
    const transaction = buildCommandTransaction(view.state, [command]);
    if (!transaction) return false;
    view.dispatch(transaction);
    return true;
  } };
}
