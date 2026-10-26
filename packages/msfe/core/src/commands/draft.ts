import { EditorSelection, Transaction, type EditorState, type TransactionSpec } from "@quirekit/cm-state";
import type { MsfeEditor } from "../editor/types";
import type { AuthorCommandFactories, ChainedCommands, Command, CommandProps, SingleCommands, SourceTransaction } from "./types";

/**
 * Runs curried commands inside one unpublished immutable-state sequence.
 * @param initial - Root state or a parent's draft for can().
 * @param factories - Installed typed commands, erased only at this boundary.
 * @param editor - Late editor reference.
 * @param dryRun - Suppresses dispatch availability and all canonical publication.
 * @returns Draft owner used by root and nested commands.
 */
export function commandDraft(initial: EditorState, factories: AuthorCommandFactories, editor: () => MsfeEditor, dryRun: boolean) {
  let state = initial;
  let specs: TransactionSpec[] = [];
  const tr: SourceTransaction = {
    get state() { return state; },
    effect: (effect, value) => tr.apply({ effects: effect.of(value) }),
    setMeta: (metadata, value) => tr.apply({ annotations: metadata.of(value) }),
    insertText(text) { return tr.apply(state.replaceSelection(text)); },
    replace(from, to, insert) {
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > to || to > state.doc.length) return false;
      return tr.apply({ changes: { from, to, insert } });
    },
    setSelection(anchor, head = anchor) {
      if (![anchor, head].every(value => Number.isInteger(value) && value >= 0 && value <= state.doc.length)) return false;
      return tr.apply({ selection: EditorSelection.single(anchor, head) });
    },
    apply(spec) {
      // The immutable draft is the only writer. Rejected or queried drafts never touch the mounted view.
      try { state = state.update(spec).state; specs.push({ ...spec, sequential: true }); return true; }
      catch { return false; }
    },
  };
  /** @param command - Pure body. @returns Accepted result, rolling back this command on rejection or exception. */
  function run(command: Command): boolean {
    const before = state, count = specs.length;
    try { if (command(props)) return true; }
    catch (error) { state = before; specs = specs.slice(0, count); throw error; }
    state = before; specs = specs.slice(0, count);
    return false;
  }
  /** @param name - Runtime name. @param args - Typed at the caller. @returns Installed body, or a rejecting body. */
  function resolve(name: string, args: never[]): Command { return factories[name]?.(...args) ?? (() => false); }
  const commands = new Proxy(Object.create(null) as SingleCommands, {
    get: (_object, name) => typeof name === "string" && name !== "then"
      ? (...args: never[]) => run(resolve(name, args)) : undefined,
  });
  /** @returns Independent pending chain whose run remains inside this draft. */
  function chain(): ChainedCommands {
    const pending: Command[] = [];
    const result = new Proxy(Object.create(null) as ChainedCommands, {
      get: (_object, name) => {
        if (name === "run") return () => pending.length > 0 && run(() => pending.every(command => run(command)));
        if (name === "command") return (command: Command) => { pending.push(command); return result; };
        return typeof name === "string" && name !== "then" ? (...args: never[]) => { pending.push(resolve(name, args)); return result; } : undefined;
      },
    });
    return result;
  }
  const props: CommandProps = {
    get state() { return state; }, get editor() { return editor(); }, tr, commands,
    dispatch: dryRun ? undefined : () => {}, chain,
    can: () => commandDraft(state, factories, editor, true).commands,
  };
  return { run, commands,
    /** @returns Combined source changes and selection with no intermediate history events. */
    finish(): TransactionSpec {
      const transaction = initial.update(...specs);
      return { changes: transaction.changes, selection: transaction.newSelection, effects: transaction.effects,
        annotations: specs.flatMap(spec => [
          ...(spec.annotations ? Array.isArray(spec.annotations) ? spec.annotations : [spec.annotations] : []),
          ...(spec.userEvent ? [Transaction.userEvent.of(spec.userEvent)] : []),
        ]),
        scrollIntoView: transaction.scrollIntoView };
    },
  };
}
