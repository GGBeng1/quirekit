import type {
  QuireDevtoolsInteractionEntry,
  QuireDevtoolsInteractionFinishInput,
  QuireDevtoolsInteractionToken,
  QuireDevtoolsOperationEntry,
  QuireDevtoolsOperationFinishInput,
  QuireDevtoolsOperationToken,
  QuireDevtoolsRenderEntry,
  QuireDevtoolsRenderSummary
} from "../types";

/**
 * Creates a measured operation entry.
 *
 * @param id - Entry id.
 * @param token - Operation token.
 * @param endedAt - Operation end timestamp.
 * @param slowThresholdMs - Slow entry threshold in milliseconds.
 * @returns Operation entry.
 */
export function createOperationEntry(
  id: number,
  token: QuireDevtoolsOperationToken,
  input: QuireDevtoolsOperationFinishInput,
  endedAt: number,
  slowThresholdMs: number
): QuireDevtoolsOperationEntry {
  const durationMs = endedAt - token.startedAt;

  return {
    id,
    kind: "operation",
    source: token.source,
    stepCount: token.stepCount,
    docChanged: token.docChanged,
    selectionSet: token.selectionSet,
    metaKeys: token.metaKeys,
    ...(token.details ? { details: token.details } : {}),
    ...(token.trigger ? { trigger: token.trigger } : {}),
    ...(input.phases ? { phases: [...input.phases] } : {}),
    startedAt: token.startedAt,
    endedAt,
    durationMs,
    measured: true,
    slow: durationMs >= slowThresholdMs
  };
}

/**
 * Creates an observed render entry.
 *
 * @param id - Entry id.
 * @param summary - Render summary.
 * @param timestamp - Timestamp when the render event was observed.
 * @returns Render entry.
 */
export function createRenderEntry(
  id: number,
  summary: QuireDevtoolsRenderSummary,
  timestamp: number,
  slowThresholdMs: number
): QuireDevtoolsRenderEntry {
  const durationMs = summary.durationMs ?? 0;
  const measured = summary.durationMs !== undefined;

  return {
    id,
    kind: "render",
    render: summary,
    startedAt: timestamp,
    endedAt: timestamp + durationMs,
    durationMs,
    measured,
    slow: measured && durationMs >= slowThresholdMs
  };
}

/**
 * Creates a measured interaction latency entry.
 *
 * @param id - Entry id.
 * @param token - Interaction token.
 * @param input - Interaction finish metadata.
 * @param endedAt - Interaction end timestamp.
 * @param slowThresholdMs - Slow entry threshold in milliseconds.
 * @returns Interaction entry.
 */
export function createInteractionEntry(
  id: number,
  token: QuireDevtoolsInteractionToken,
  input: QuireDevtoolsInteractionFinishInput,
  endedAt: number,
  slowThresholdMs: number
): QuireDevtoolsInteractionEntry {
  const durationMs = endedAt - token.startedAt;

  return {
    id,
    kind: "interaction",
    source: token.source,
    ...(token.label ? { label: token.label } : {}),
    ...(token.key ? { key: token.key } : {}),
    ...(token.inputType ? { inputType: token.inputType } : {}),
    ...(token.target ? { target: token.target } : {}),
    settled: input.settled,
    operationCount: input.operationCount,
    renderCount: input.renderCount,
    ...(input.operationEntryIds ? { operationEntryIds: [...input.operationEntryIds] } : {}),
    ...(input.renderEntryIds ? { renderEntryIds: [...input.renderEntryIds] } : {}),
    ...(input.renderEntryId !== undefined ? { renderEntryId: input.renderEntryId } : {}),
    startedAt: token.startedAt,
    endedAt,
    durationMs,
    measured: true,
    slow: durationMs >= slowThresholdMs
  };
}
