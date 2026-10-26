import type * as coreCommands from "./core-commands";
import type * as markCommands from "./mark-commands";

/** Runtime command exports installed by the core Commands extension. */
type CoreCommandExports = typeof coreCommands & typeof markCommands;

/** Value exports from the built-in command module that are command factories. */
type CoreCommandFactories = {
  [Name in keyof CoreCommandExports as CoreCommandExports[Name] extends (...args: any[]) => any
    ? Name
    : never]: CoreCommandExports[Name];
};

/**
 * Tiptap-compatible methods derived from the built-in raw command factories.
 *
 * @template ReturnType - Return surface selected by single, chain, or can mode.
 */
export type CoreCommandMethods<ReturnType> = {
  /** Built-in command method preserving the source factory's argument list. */
  [Name in keyof CoreCommandFactories]: CoreCommandFactories[Name] extends (
    ...args: infer Args
  ) => any
    ? (...args: Args) => ReturnType
    : never;
};
