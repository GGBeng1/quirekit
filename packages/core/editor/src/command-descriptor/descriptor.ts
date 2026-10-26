import type { AnyCommands, CommandSpec } from "../types";
import type { QuireCommandDefinition, QuireCommandDescriptor } from "./types";

/** Property key holding a command's description on its factory function. */
const descriptorKey = Symbol.for("quirekit.command.descriptor");

/**
 * Declares a command with an Agent-facing description. The result is still the command factory
 * Tiptap expects from `addCommands()`; the description rides on the function, so merging and
 * overriding commands by name keep each description with its implementation.
 *
 * @param definition - Description and the command factory.
 * @returns A command factory carrying the frozen description.
 */
export function defineCommand<Run extends CommandSpec>(definition: QuireCommandDefinition<Run>): Run {
  const { run, ...descriptor } = definition;
  // A fresh function, so one factory reused under two names cannot share or overwrite a description;
  // it forwards the receiver it is called with, so a `function` command keeps its own `this`.
  const command = function (this: unknown, ...args: Parameters<Run>) {
    return run.apply(this, args);
  } as Run;
  Object.defineProperty(command, descriptorKey, { value: Object.freeze({ ...descriptor }), enumerable: false });
  return command;
}

/**
 * @param command - Command factory from `addCommands()`.
 * @returns Its description, or undefined for a command declared without one.
 */
export function getCommandDescriptor(command: CommandSpec): QuireCommandDescriptor | undefined {
  return (command as unknown as Record<symbol, QuireCommandDescriptor | undefined>)[descriptorKey];
}

/**
 * Lists the registered commands that carry a description, keyed by command name.
 * @param editor - Editor whose resolved commands are read.
 * @returns Descriptions in command registration order.
 */
export function readCommandDescriptors(editor: { readonly extensionManager: { readonly commands: AnyCommands } }): ReadonlyMap<string, QuireCommandDescriptor> {
  const described = new Map<string, QuireCommandDescriptor>();
  for (const [name, command] of Object.entries(editor.extensionManager.commands)) {
    const descriptor = getCommandDescriptor(command);
    if (descriptor !== undefined) described.set(name, descriptor);
  }
  return described;
}
