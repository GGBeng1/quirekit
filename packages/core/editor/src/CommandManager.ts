import type { EditorState as PMEditorState, Transaction } from "@quirekit/pm";
import type { QuireEditor } from "./Editor";
import { createChainableState } from "./helpers/createChainableState";
import { createQuireCommandMethods } from "./helpers/command-methods";
import type {
  AnyCommands,
  CanCommands,
  ChainedCommands,
  CommandProps,
  SingleCommands
} from "./types";

/** Options used to create a command manager. */
export interface QuireCommandManagerOptions {
  /** Editor that owns the commands. */
  readonly editor: QuireEditor;
  /** Optional state used by `can()` or custom command checks. */
  readonly state?: PMEditorState | undefined;
}

/** Tiptap-compatible manager for extension-contributed command factories. */
export class QuireCommandManager {
  /** Editor that owns this command manager. */
  readonly editor: QuireEditor;

  /** Raw command factories aggregated by the extension manager. */
  readonly rawCommands: AnyCommands;

  /** Optional state used for isolated command evaluation. */
  readonly customState?: PMEditorState | undefined;

  /**
   * Creates a command manager.
   *
   * @param options - Editor and optional custom state.
   */
  constructor(options: QuireCommandManagerOptions) {
    this.editor = options.editor;
    this.rawCommands = options.editor.extensionManager.commands;
    this.customState = options.state;
  }

  /**
   * Reports whether command evaluation uses a custom state.
   *
   * @returns Whether a custom state was supplied.
   */
  get hasCustomState(): boolean {
    return this.customState !== undefined;
  }

  /**
   * Returns the ProseMirror state used for command execution.
   *
   * @returns Custom state or the editor's current state.
   */
  get state(): PMEditorState {
    return this.customState ?? this.editor.state.pm;
  }

  /**
   * Returns immediately executing command methods.
   *
   * @returns Tiptap-compatible single-command surface.
   */
  get commands(): SingleCommands {
    const transaction = this.state.tr;
    const props = this.buildProps(transaction);

    return createQuireCommandMethods(this.rawCommands, (command) =>
      (...args: readonly unknown[]) => {
        const handled = command(...args)(props);

        if (!transaction.getMeta("preventDispatch") && !this.hasCustomState) {
          this.editor.view.dispatch(transaction);
        }

        return handled;
      }
    ) as unknown as SingleCommands;
  }

  /**
   * Returns a factory for dispatching command chains.
   *
   * @returns Chain factory.
   */
  get chain(): () => ChainedCommands {
    return () => this.createChain();
  }

  /**
   * Returns a factory for non-dispatching capability checks.
   *
   * @returns Capability-check factory.
   */
  get can(): () => CanCommands {
    return () => this.createCan();
  }

  /**
   * Creates a chain that shares one transaction and dispatches from `run()`.
   *
   * @param startTransaction - Optional transaction to continue.
   * @param shouldDispatch - Whether `run()` may dispatch the transaction.
   * @returns Chainable command methods.
   */
  createChain(
    startTransaction?: Transaction,
    shouldDispatch = true
  ): ChainedCommands {
    const callbacks: boolean[] = [];
    const hasStartTransaction = startTransaction !== undefined;
    const transaction = startTransaction ?? this.state.tr;
    const chain = createQuireCommandMethods(this.rawCommands, (command) =>
      (...args: readonly unknown[]) => {
        const handled = command(...args)(
          this.buildProps(transaction, shouldDispatch)
        );
        callbacks.push(handled);
        return chain;
      }
    ) as unknown as ChainedCommands;
    chain.run = () => {
      if (
        !hasStartTransaction
        && shouldDispatch
        && !transaction.getMeta("preventDispatch")
        && !this.hasCustomState
      ) {
        this.editor.view.dispatch(transaction);
      }

      return callbacks.every((callback) => callback === true);
    };

    return chain;
  }

  /**
   * Creates a chain proxy that always reports failure.
   *
   * @returns Non-dispatching fallback chain.
   */
  static createFakeChain(): ChainedCommands {
    const chain = new Proxy({}, {
      get: (_target, property) => {
        if (property === "then") return undefined;
        if (property === "run") return () => false;
        return () => chain;
      }
    }) as ChainedCommands;

    return chain;
  }

  /**
   * Creates non-dispatching command methods backed by one transaction.
   *
   * @param startTransaction - Optional transaction to inspect.
   * @returns Capability-check methods.
   */
  createCan(startTransaction?: Transaction): CanCommands {
    const transaction = startTransaction ?? this.state.tr;
    const props = this.buildProps(transaction, false);
    // The shared props already disable dispatch; keep nested commands lazy
    // instead of materializing their full table by spreading the props.
    const commands = createQuireCommandMethods(this.rawCommands, (command) =>
      (...args: readonly unknown[]) => command(...args)(props)
    ) as unknown as SingleCommands;

    return Object.assign(commands, {
      chain: () => this.createChain(transaction, false)
    }) as CanCommands;
  }

  /**
   * Creates a capability proxy that always reports failure.
   *
   * @returns Non-dispatching fallback capability checker.
   */
  static createFallbackCan(): CanCommands {
    const chain = QuireCommandManager.createFakeChain();
    const can = new Proxy({ chain: () => chain }, {
      get: (target, property) => {
        if (property === "then") return undefined;
        if (property === "chain") return target.chain;
        return () => false;
      }
    }) as CanCommands;

    return can;
  }

  /**
   * Builds the exact command props shared by raw command callbacks.
   *
   * @param transaction - Shared transaction exposed to the command.
   * @param shouldDispatch - Whether dispatch is available to the command.
   * @returns Tiptap-compatible command props.
   */
  buildProps(
    transaction: Transaction,
    shouldDispatch = true
  ): CommandProps {
    const rawCommands = this.rawCommands;
    const props: CommandProps = {
      editor: this.editor,
      tr: transaction,
      state: createChainableState({
        state: this.state,
        transaction
      }),
      view: this.editor.view,
      dispatch: shouldDispatch ? () => undefined : undefined,
      chain: () => this.createChain(transaction, shouldDispatch),
      can: () => this.createCan(transaction),
      get commands() {
        return createQuireCommandMethods(rawCommands, (command) =>
          (...args: readonly unknown[]) => command(...args)(props)
        ) as unknown as SingleCommands;
      }
    };

    return props;
  }
}

/** Tiptap-compatible public command manager name. */
export { QuireCommandManager as CommandManager };
