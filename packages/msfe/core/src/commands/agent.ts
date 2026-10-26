import { changeOrigin } from "../state/fields";
import type { MsfeEditor } from "../editor/types";
import type { MsfeCommand } from "../state/types";
import type { AuthorCommandFactories, Command, MsfeCommandDescriptor } from "./types";

/** What the AI integration reads from a mounted editor. */
interface AgentSurface {
  /** Installed author command factories by name. */
  readonly factories: AuthorCommandFactories;
  /** @param name - Command name. @param args - Command arguments. @returns Pure planner of the named command, or undefined when not installed. */
  readonly plan: (name: string, args: readonly unknown[]) => MsfeCommand | undefined;
  /** @returns Facts the installed extensions contribute to the AI core, in installation order. */
  readonly capabilities: () => readonly unknown[];
}

const descriptors = new WeakMap<object, MsfeCommandDescriptor>();
const surfaces = new WeakMap<MsfeEditor, AgentSurface>();

/**
 * Attaches an Agent description to a command factory, for the AI core to offer the command.
 * @param definition - Description and the curried command factory.
 * @returns The same factory, to return from `addCommands`.
 */
export function defineCommand<Run extends (...args: never[]) => Command>(definition: MsfeCommandDescriptor & { readonly run: Run }): Run {
  const { run, ...descriptor } = definition;
  // Descriptions are keyed by the factory, so every described command needs its own function.
  if (descriptors.has(run)) throw new Error("defineCommand: this command factory already has a description; give each command its own run function");
  descriptors.set(run, Object.freeze(descriptor));
  return run;
}

/**
 * Lists the installed commands that carry an Agent description.
 * @param editor - Mounted editor.
 * @returns Descriptions by command name.
 */
export function readCommandDescriptors(editor: MsfeEditor): ReadonlyMap<string, MsfeCommandDescriptor> {
  const surface = surfaces.get(editor);
  const result = new Map<string, MsfeCommandDescriptor>();
  if (surface === undefined) return result;
  for (const [name, factory] of Object.entries(surface.factories)) {
    const descriptor = descriptors.get(factory);
    if (descriptor !== undefined) result.set(name, descriptor);
  }
  return result;
}

/**
 * Builds the pure planner of a named command, to combine with other planners in one transaction.
 * @param editor - Mounted editor.
 * @param name - Command name.
 * @param args - Command arguments.
 * @returns Planner, or undefined when the command is not installed.
 */
export function planNamedCommand(editor: MsfeEditor, name: string, args: readonly unknown[]): MsfeCommand | undefined {
  return surfaces.get(editor)?.plan(name, args);
}

/**
 * Collects the facts installed extensions contribute through `addAiCapabilities`.
 * @param editor - Mounted editor.
 * @returns Facts in installation order; their types belong to the AI contract.
 */
export function readAiCapabilities(editor: MsfeEditor): readonly unknown[] {
  return surfaces.get(editor)?.capabilities() ?? [];
}

/**
 * Labels the transaction of a command chain with its origin, such as `agent` for AI writes,
 * so change events and observers can tell who changed the source.
 * @param origin - Origin reported in change events.
 * @returns Planner that changes nothing but the label; put it first in the chain.
 */
export function markChangeOrigin(origin: string): MsfeCommand {
  return () => ({ annotations: changeOrigin.of(origin) });
}

/**
 * Registers what the AI integration may read from an editor.
 * @param editor - Mounted editor.
 * @param surface - Command factories, planner and fact collector.
 */
export function registerAgentSurface(editor: MsfeEditor, surface: AgentSurface): void {
  surfaces.set(editor, surface);
}
