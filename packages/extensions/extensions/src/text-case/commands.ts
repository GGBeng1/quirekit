import type { CommandProps, CommandSpec } from "@quirekit/core";
import type { EditorState, Mark, Transaction } from "@quirekit/pm";
import { collectTextCaseBlocks, resolveTextCaseWord } from "./collect";
import { convertTextCaseUnits } from "./convert";
import type { TextCaseMode, TextCaseOptions, TextCaseStorage } from "./types";

/** One contiguous rewrite inside a single text node. */
interface TextCaseChange {
  /** Range start. */
  readonly from: number;
  /** Range end. */
  readonly to: number;
  /** Replacement text. */
  readonly text: string;
  /** Marks of the replaced text node. */
  readonly marks: readonly Mark[];
}

const cycle: readonly TextCaseMode[] = ["lower", "upper", "capitalize"];

/**
 * Creates the change-case commands.
 *
 * @param options - Host skip rule.
 * @param storage - Shift+F3 cycle memory.
 * @returns Command map.
 */
export function createTextCaseCommands(
  options: TextCaseOptions,
  storage: TextCaseStorage
): { readonly changeTextCase: CommandSpec; readonly cycleTextCase: CommandSpec } {
  return {
    changeTextCase: (mode: TextCaseMode) => (context: CommandProps) => applyTextCase(context, mode, options) !== null,
    cycleTextCase: () => (context: CommandProps) => {
      const range = resolveTextCaseRange(context.tr);
      if (range === null) return false;
      const mode = storage.lastCycleDocument === context.tr.doc && storage.lastCycleMode !== null
        ? cycle[(cycle.indexOf(storage.lastCycleMode) + 1) % cycle.length]!
        : firstCycleMode(context.tr, range);
      const tr = applyTextCase(context, mode, options);
      if (tr === null) return false;
      if (context.dispatch !== undefined) {
        storage.lastCycleDocument = tr.doc;
        storage.lastCycleMode = mode;
      }
      return true;
    }
  };
}

/**
 * Chooses the first Shift+F3 step from the current letters.
 *
 * @param tr - Current transaction.
 * @param range - Affected range.
 * @returns UPPERCASE for all-lowercase text, otherwise lowercase.
 */
function firstCycleMode(tr: Transaction, range: { from: number; to: number }): TextCaseMode {
  const text = tr.doc.textBetween(range.from, range.to, " ", " ");
  return text === text.toLowerCase() && text !== text.toUpperCase() ? "upper" : "lower";
}

/**
 * Resolves the selection, or the word at the caret.
 *
 * @param tr - Current transaction.
 * @returns Range to rewrite, or null.
 */
function resolveTextCaseRange(tr: Transaction): { from: number; to: number } | null {
  const { from, to, empty } = tr.selection;
  return empty ? resolveTextCaseWord(tr.doc, from) : { from, to };
}

/**
 * Rewrites the characters of the current range in one transaction.
 *
 * @param context - Command context.
 * @param mode - Requested rewrite.
 * @param options - Host skip rule.
 * @returns Transaction carrying the rewrite, or null when nothing can change.
 */
function applyTextCase(context: CommandProps, mode: TextCaseMode, options: TextCaseOptions): Transaction | null {
  if (!context.editor.isEditable) return null;
  const { tr } = context;
  const range = resolveTextCaseRange(tr);
  if (range === null) return null;
  // Host rules and filter trials read positions in the committed document; a chain
  // that already changed the document skips them rather than misplace them.
  const committed = tr.docChanged ? null : context.editor.state.pm;
  // Phase 1: compute minimal per-text-node rewrites against the unchanged document.
  const changes = collectChanges(tr, range, mode).filter(change => (
    committed === null || (options.checkChangeable?.(committed, change.from, change.to) ?? true)
  ));
  // Phase 2: admit the whole batch, or fall back to the changes filters accept one by one.
  const admitted = committed === null || admits(committed, changes)
    ? changes
    : changes.filter(change => admits(committed, [change]));
  if (admitted.length === 0) return null;
  for (const change of [...admitted].reverse()) {
    tr.replaceWith(change.from, change.to, tr.doc.type.schema.text(change.text, change.marks));
  }
  context.dispatch?.(tr);
  return tr;
}

/**
 * Collects contiguous changed characters, split at text node boundaries.
 *
 * @param tr - Transaction whose document is read.
 * @param range - Range to rewrite.
 * @param mode - Requested rewrite.
 * @returns Changes in document order.
 */
function collectChanges(tr: Transaction, range: { from: number; to: number }, mode: TextCaseMode): TextCaseChange[] {
  const changes: TextCaseChange[] = [];
  for (const { units, owners } of collectTextCaseBlocks(tr.doc, range.from, range.to)) {
    const next = convertTextCaseUnits(units, mode);
    let open: { from: number; to: number; text: string; owner: (typeof owners)[number] } | null = null;
    const close = () => {
      if (open !== null) changes.push({ from: open.from, to: open.to, text: open.text, marks: open.owner!.marks });
      open = null;
    };
    units.forEach((unit, index) => {
      const changed = unit.target && next[index] !== unit.char;
      if (!changed) { close(); return; }
      const current = open as { from: number; to: number; text: string; owner: (typeof owners)[number] } | null;
      if (current !== null && current.owner === owners[index] && current.to === unit.pos) {
        current.to += unit.char.length;
        current.text += next[index];
        return;
      }
      close();
      open = { from: unit.pos, to: unit.pos + unit.char.length, text: next[index]!, owner: owners[index] ?? null };
    });
    close();
  }
  return changes;
}

/**
 * Tries changes against the committed state's transaction filters.
 *
 * @param state - Committed state.
 * @param changes - Candidate changes.
 * @returns Whether every filter admits the trial transaction.
 */
function admits(state: EditorState, changes: readonly TextCaseChange[]): boolean {
  const filters = state.plugins.filter(plugin => plugin.spec.filterTransaction !== undefined);
  if (filters.length === 0) return true;
  const trial = state.tr;
  for (const change of [...changes].reverse()) {
    trial.replaceWith(change.from, change.to, state.schema.text(change.text, change.marks));
  }
  return filters.every(plugin => plugin.spec.filterTransaction!.call(plugin, trial, state));
}
