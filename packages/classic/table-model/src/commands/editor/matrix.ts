import type {
  AnyCommands,
  CommandProps,
  CommandSpec
} from "@quirekit/core";
import type {
  Node as PMNode,
  Transaction
} from "@quirekit/pm";
import {
  createWordTableMatrixPasteReport,
  pasteWordTableMatrixIntoTable,
  prepareWordTableMatrix,
  wordTableMatrixPasteTransactionMeta,
  type InsertWordTableMatrixOptions,
  type PasteWordTableMatrixCommandOptions,
  type PasteWordTableMatrixIntoTableCommandOptions,
  type PreparedWordTableMatrix
} from "../matrix";
import { wordTableRepairTransactionMeta } from "../repair";
import { isObjectRecord, locateWordTable } from "../derive/editor/table";
import { insertWordTableNode } from "./insertion";

/**
 * Creates the parsed-matrix paste command family.
 *
 * @returns Editor command map for fill, expand, and new-table insertion.
 */
export function createWordTableMatrixEditorCommands(): AnyCommands {
  return { pasteWordTableMatrix };
}

/** Executes one explicit matrix strategy through the feature-owned command. */
const pasteWordTableMatrix: CommandSpec = (options) => (context) => {
  if (!isObjectRecord(options)) return rejectMatrixCommand(context);
  if (options.strategy === "insert") {
    return insertMatrix(context, options as unknown as InsertWordTableMatrixOptions);
  }
  if (options.strategy !== "fill" && options.strategy !== "expand") {
    return rejectMatrixCommand(context);
  }

  const commandOptions = options as unknown as
    PasteWordTableMatrixIntoTableCommandOptions;
  const located = locateWordTable(context, commandOptions.tablePos);
  if (!located) return rejectMatrixCommand(context);
  const result = pasteWordTableMatrixIntoTable(located.node, commandOptions);
  if (!result.ok) return rejectMatrixCommand(context);
  if (result.value === located.node) return acceptMatrixNoop(context);

  const source = prepareWordTableMatrix(
    context.state.schema,
    commandOptions.matrix,
    commandOptions.lossDiagnostics
  );
  if (!source) return rejectMatrixCommand(context);

  context.tr.replaceWith(
    located.pos,
    located.pos + located.node.nodeSize,
    result.value
  );
  attachMatrixTransactionMeta(
    context.tr,
    commandOptions.strategy,
    source,
    located.node,
    result.value
  );
  if (result.repair) {
    context.tr.setMeta(wordTableRepairTransactionMeta, result.repair);
  }
  context.dispatch?.(context.tr.scrollIntoView());
  return true;
};

/**
 * Inserts one prepared matrix as a new logical Word table.
 *
 * @param context - Active editor command context.
 * @param options - New-table matrix options.
 * @returns Whether insertion succeeded.
 */
function insertMatrix(
  context: CommandProps,
  options: InsertWordTableMatrixOptions
): boolean {
  const source = prepareWordTableMatrix(
    context.state.schema,
    options.matrix,
    options.lossDiagnostics
  );
  if (!source) return rejectMatrixCommand(context);

  attachMatrixTransactionMeta(
    context.tr,
    "insert",
    source,
    null,
    source.tableNode
  );
  return insertWordTableNode(context, source.tableNode, options.position)
    || rejectMatrixCommand(context);
}

/**
 * Rejects one matrix command without dispatching an empty transaction.
 *
 * @param context - Active command context.
 * @returns Always false.
 */
function rejectMatrixCommand(context: CommandProps): false {
  context.tr.setMeta("preventDispatch", true);
  return false;
}

/**
 * Accepts a no-op matrix command without dispatching when it owns an empty transaction.
 *
 * @param context - Active command context.
 * @returns Always true.
 */
function acceptMatrixNoop(context: CommandProps): true {
  if (context.tr.steps.length === 0) {
    context.tr.setMeta("preventDispatch", true);
  }
  return true;
}

/**
 * Attaches the matrix result and intake losses to the mutation transaction.
 *
 * @param tr - Transaction receiving the matrix mutation.
 * @param strategy - Committed matrix strategy.
 * @param source - Validated source matrix.
 * @param previousTable - Previous table, or null for insertion.
 * @param resultTable - Resulting logical table.
 */
function attachMatrixTransactionMeta(
  tr: Transaction,
  strategy: PasteWordTableMatrixCommandOptions["strategy"],
  source: PreparedWordTableMatrix,
  previousTable: PMNode | null,
  resultTable: PMNode
): void {
  tr.setMeta(
    wordTableMatrixPasteTransactionMeta,
    createWordTableMatrixPasteReport(
      strategy,
      source,
      previousTable,
      resultTable
    )
  );
}
