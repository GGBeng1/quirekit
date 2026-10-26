import type { QuireKitChatInputSnapshot } from '../../../components/chat/rich-input/types';

/** Small bounded transaction history for text and semantic tokens together. */
export function createChatInputHistory() {
  const undoStack: QuireKitChatInputSnapshot[] = [];
  const redoStack: QuireKitChatInputSnapshot[] = [];

  /** Save a pre-edit state, invalidating redo.
   * @param snapshot - State before one input transaction.
   */
  function push(snapshot: QuireKitChatInputSnapshot): void {
    undoStack.push(snapshot);
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
  }

  /** Undo or redo an atomic text-plus-token transaction.
   * @param direction - Stack to consume.
   * @param current - State to place on the opposite stack.
   * @returns State to restore, when available.
   */
  function step(direction: 'undo' | 'redo', current: QuireKitChatInputSnapshot): QuireKitChatInputSnapshot | undefined {
    const source = direction === 'undo' ? undoStack : redoStack;
    const target = direction === 'undo' ? redoStack : undoStack;
    const previous = source.pop();
    if (previous) target.push(current);
    return previous;
  }

  /** External replacement starts a separate draft history. */
  function clear(): void { undoStack.length = 0; redoStack.length = 0; }
  return { push, step, clear };
}
