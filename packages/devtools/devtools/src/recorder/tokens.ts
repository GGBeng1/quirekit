import type {
  QuireDevtoolsClock,
  QuireDevtoolsInteractionInput,
  QuireDevtoolsInteractionToken,
  QuireDevtoolsOperationInput,
  QuireDevtoolsOperationToken
} from "../types";

/**
 * Creates an operation timing token.
 *
 * @param input - Operation metadata.
 * @param clock - Clock used to stamp the token.
 * @returns Operation token.
 */
export function createOperationToken(
  input: QuireDevtoolsOperationInput,
  clock: QuireDevtoolsClock
): QuireDevtoolsOperationToken {
  return {
    source: input.source ?? "transaction",
    stepCount: input.stepCount ?? 0,
    docChanged: input.docChanged ?? false,
    selectionSet: input.selectionSet ?? false,
    metaKeys: [...(input.metaKeys ?? [])],
    ...(input.details ? { details: input.details } : {}),
    ...(input.trigger ? { trigger: input.trigger } : {}),
    startedAt: clock()
  };
}

/**
 * Creates an interaction timing token.
 *
 * @param input - Interaction metadata.
 * @param clock - Clock used to stamp the token.
 * @returns Interaction token.
 */
export function createInteractionToken(
  input: QuireDevtoolsInteractionInput,
  clock: QuireDevtoolsClock
): QuireDevtoolsInteractionToken {
  return {
    source: input.source,
    ...(input.label ? { label: input.label } : {}),
    ...(input.key ? { key: input.key } : {}),
    ...(input.inputType ? { inputType: input.inputType } : {}),
    ...(input.target ? { target: input.target } : {}),
    startedAt: clock()
  };
}
