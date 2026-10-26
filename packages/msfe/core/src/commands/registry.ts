import { commandDraft } from "./draft";
import type { MsfeCommand } from "../state/types";
import type { MsfeEditor, MsfeResult, MsfeTarget } from "../editor/types";
import type { AuthorCommandFactories, CanCommands, ChainedCommands, Command, CommandExecutor, SingleCommands } from "./types";

/**
 * Boolean author commands use the existing atomic source executor, retaining detailed rejection diagnostics.
 * @param factories - Validated unique factories.
 * @param executor - Canonical run/can implementation.
 * @param editor - Late editor reference.
 * @returns Stable commands, pure queries, chains and last executed result.
 */
export function createCommandRegistry(factories: AuthorCommandFactories, executor: CommandExecutor, editor: () => MsfeEditor) {
  let lastResult: MsfeResult | undefined;
  /** @param command - Author body. @param dryRun - Applicability-only flag. @returns Pure source planner. */
  function planner(command: Command, dryRun: boolean): MsfeCommand {
    return state => { const draft = commandDraft(state, factories, editor, dryRun); return draft.run(command) ? draft.finish() : null; };
  }
  /** @param name - Public command name. @param args - Typed at the caller. @returns Body or absence. */
  function resolve(name: string, args: never[]): Command | undefined { return factories[name]?.(...args); }
  /** @param pending - Atomic commands. @param target - Captured intent. @param missing - Missing installation. @returns Boolean outcome. */
  function execute(pending: readonly Command[], target?: MsfeTarget, missing = false): boolean {
    lastResult = missing ? { ok: false, reason: "not-installed" } : executor.run(pending.map(command => planner(command, false)), target);
    return lastResult.ok;
  }
  const commands = new Proxy(Object.create(null) as SingleCommands, {
    get: (_target, name) => typeof name === "string" && name !== "then"
      ? (...args: never[]) => { const command = resolve(name, args); return execute(command ? [command] : [], undefined, !command); }
      : undefined,
  });
  /** @param target - Optional captured intent. @returns Pure applicability facade. */
  function can(target?: MsfeTarget): CanCommands {
    return new Proxy(Object.create(null) as CanCommands, {
      get: (_object, name) => name === "chain" ? () => chain(target, true) : typeof name === "string" && name !== "then"
        ? (...args: never[]) => { const command = resolve(name, args); return !!command && executor.can(planner(command, true), target); }
        : undefined,
    });
  }
  /** @param target - Optional captured intent. @param dryRun - Query without publication. @returns New independent fluent chain. */
  function chain(target?: MsfeTarget, dryRun = false): ChainedCommands {
    const pending: Command[] = [];
    let missing = false;
    const result = new Proxy(Object.create(null) as ChainedCommands, {
      get: (_object, name) => {
        if (name === "run") return () => dryRun
          ? !missing && pending.length > 0 && executor.can(planner(props => pending.every(command => command(props)), true), target)
          : execute(pending, target, missing);
        if (name === "command") return (command: Command) => { pending.push(command); return result; };
        if (typeof name !== "string" || name === "then") return undefined;
        return (...args: never[]) => { const command = resolve(name, args); if (command) pending.push(command); else missing = true; return result; };
      },
    });
    return result;
  }
  /** @param name - Command name. @param args - Arguments. @returns Planner of the named command, or undefined when not installed. */
  function plan(name: string, args: readonly unknown[]): MsfeCommand | undefined {
    const command = resolve(name, args as never[]);
    return command === undefined ? undefined : planner(command, false);
  }
  return { commands, can, chain, plan, get lastResult() { return lastResult; } };
}
