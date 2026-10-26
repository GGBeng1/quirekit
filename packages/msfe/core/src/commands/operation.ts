import { Annotation, type Transaction } from "@quirekit/cm-state";
import { changeOrigin } from "../state/fields";
import type { MsfeCommand } from "../state/types";

/** What a product action did, for observers such as activity records; never part of the document. */
export interface SourceOperation {
  /** Feature-named kind, e.g. `block.insert` or `md.highlight.color`. */
  readonly kind: string;
  /** Kind-owned JSON facts, e.g. `{ type: "table" }`. */
  readonly facts?: Readonly<Record<string, unknown>> | undefined;
}

/** Labels a transaction with the product operation that produced it. */
export const sourceOperation = Annotation.define<SourceOperation>();

/**
 * Wraps a command so its transaction carries an operation label.
 * @param command - Source command.
 * @param operation - Kind and facts.
 * @returns The same command, labelled; a rejected command stays rejected.
 */
export function withSourceOperation(command: MsfeCommand, operation: SourceOperation): MsfeCommand {
  return state => {
    const spec = command(state);
    if (!spec) return spec;
    const annotations = spec.annotations === undefined ? [] : Array.isArray(spec.annotations) ? spec.annotations : [spec.annotations];
    return { ...spec, annotations: [...annotations, sourceOperation.of(operation)] };
  };
}

/**
 * @param transaction - Accepted transaction.
 * @returns Its change origin label (`remote`, `history`, `external`, `agent`, ...), or undefined for direct input.
 */
export function readChangeOrigin(transaction: Transaction): string | undefined {
  return transaction.annotation(changeOrigin);
}
