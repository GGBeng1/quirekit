import type { EditorState as PMEditorState, Transaction } from "@quirekit/pm";

/** Options used to create a chainable editor state. */
export interface QuireCreateChainableStateOptions {
  /** Transaction whose mutable state should be exposed. */
  readonly transaction: Transaction;
  /** Editor state used as the immutable base. */
  readonly state: PMEditorState;
}

/**
 * Creates an EditorState facade whose doc, selection, and stored marks follow
 * a shared transaction.
 *
 * @param options - Chainable state options.
 * @returns EditorState facade for chain command execution.
 */
export function createChainableState(
  options: QuireCreateChainableStateOptions
): PMEditorState {
  const { state, transaction } = options;
  let { selection } = transaction;
  let { doc } = transaction;
  let { storedMarks } = transaction;

  return {
    ...state,
    apply: state.apply.bind(state),
    applyTransaction: state.applyTransaction.bind(state),
    filterTransaction: state.filterTransaction.bind(state),
    plugins: state.plugins,
    schema: state.schema,
    reconfigure: state.reconfigure.bind(state),
    toJSON: state.toJSON.bind(state),
    get storedMarks() {
      return storedMarks;
    },
    get selection() {
      return selection;
    },
    get doc() {
      return doc;
    },
    get tr() {
      selection = transaction.selection;
      doc = transaction.doc;
      storedMarks = transaction.storedMarks;

      return transaction;
    }
  } as PMEditorState;
}
