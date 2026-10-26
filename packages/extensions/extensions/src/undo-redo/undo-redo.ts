import {
  Extension,
  setQuireTransactionOrigin,
  type CommandProps
} from "@quirekit/core";
import { closeHistory as closePMHistory, history, redo, undo, type Command } from "@quirekit/pm";

/** Options used by the undo-redo history extension. */
export interface UndoRedoOptions {
  /** Maximum number of history events kept before old events are discarded. */
  readonly depth: number;
  /** Delay in milliseconds after which a new history group is started. */
  readonly newGroupDelay: number;
}

/** Extension that provides document history plus undo and redo commands. */
export const UndoRedo = Extension.create<UndoRedoOptions>({
  name: "undoRedo",
  priority: 800,
  /**
   * Creates default undo-redo options.
   *
   * @returns Default history depth and grouping delay.
   */
  addOptions() {
    return {
      depth: 100,
      newGroupDelay: 500
    };
  },
  /**
   * Creates undo-redo command handlers.
   *
   * @returns Undo and redo command map.
   */
  addCommands() {
    return {
      undo: () => undoCommand,
      redo: () => redoCommand,
      closeHistory: () => closeHistoryCommand
    };
  },
  /**
   * Creates Tiptap-compatible undo-redo keyboard shortcuts.
   *
   * @returns Keyboard shortcut handlers keyed by ProseMirror keymap names.
   */
  addKeyboardShortcuts() {
    return {
      "Mod-z": undoCommand,
      "Shift-Mod-z": redoCommand,
      "Mod-y": redoCommand,
      "Mod-я": undoCommand,
      "Shift-Mod-я": redoCommand
    };
  },
  /**
   * Creates the ProseMirror history plugin.
   *
   * @returns ProseMirror history plugin list.
   */
  addProseMirrorPlugins() {
    return [history(this.options)];
  }
});

/** Public history command methods. */
type UndoRedoCommandMethods<ReturnType> = {
  undo: () => ReturnType;
  redo: () => ReturnType;
  /** Ends the previous history group without changing document content. */
  closeHistory: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the UndoRedo extension. */
    readonly undoRedo: UndoRedoCommandMethods<ReturnType>;
  }
}

/**
 * Runs the ProseMirror undo command through the QuireKit command context.
 *
 * @param context - Command execution context with current state and dispatch.
 * @returns Whether undo handled the command.
 */
function undoCommand(context: CommandProps): boolean {
  return runUndoRedoCommand(undo, context);
}

/**
 * Runs the ProseMirror redo command through the QuireKit command context.
 *
 * @param context - Command execution context with current state and dispatch.
 * @returns Whether redo handled the command.
 */
function redoCommand(context: CommandProps): boolean {
  return runUndoRedoCommand(redo, context);
}

/**
 * Bridges a ProseMirror history command into a QuireKit command.
 *
 * @param command - ProseMirror history command to run.
 * @param context - QuireKit command execution context.
 * @returns Whether the ProseMirror command handled the request.
 */
function runUndoRedoCommand(command: Command, context: CommandProps): boolean {
  const dispatch = context.dispatch === undefined
    ? undefined
    : (transaction: Parameters<NonNullable<CommandProps["dispatch"]>>[0]) => {
        if (!transaction) return;
        context.dispatch?.(setQuireTransactionOrigin(transaction, "history"));
      };
  return command(context.state, dispatch);
}

/**
 * Establishes an explicit boundary for a host-owned atomic workflow.
 * @param context - Canonical command execution context.
 * @returns True without mutation during can(); dispatch closes the preceding group.
 */
function closeHistoryCommand(context: CommandProps): boolean {
  if (context.dispatch) closePMHistory(context.tr);
  return true;
}
