import type { CommandSpec } from "../types";
import { keyboardShortcut } from "./keyboardShortcut";

/**
 * Triggers the editor's Enter keyboard shortcut pipeline.
 *
 * @param context - Current command execution context.
 * @returns Whether the shortcut pipeline handled Enter.
 */
export const enter: CommandSpec = () => (context) => keyboardShortcut("Enter")(context);
