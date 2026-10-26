import {
  canvasInternalClipboardMime,
  serializeQuireClipboardSlice,
  type QuireClipboardData
} from "@quirekit/clipboard";
import {
  createQuireSelectionCommandHandledResult
} from "../../result";
import type {
  QuireSelectionCommandDispatchResult,
  QuireSelectionDomainCommandDispatchOptions
} from "../../types";
import { deleteQuireSourceRange } from "./delete";
import { readQuireSourceRangeCommandGuard } from "./guard";
import type { QuireSourceRangeCommandRange } from "./types";

/**
 * Handles source-range copy by serializing the represented document slice.
 *
 * @param options - Routed selection command context.
 * @param consumer - Stable consumer label for diagnostics.
 * @returns Copy-only dispatch result for the source range.
 */
export function dispatchQuireSourceRangeCopyCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  consumer: string
): QuireSelectionCommandDispatchResult {
  const guard = readQuireSourceRangeCommandGuard(
    options.commandRoute,
    "copyable"
  );

  if (guard.effect !== undefined) {
    options.clipboardEvent?.preventDefault?.();
    return createQuireSelectionCommandHandledResult(options.commandRoute, {
      consumer,
      effect: guard.effect,
      docChanged: false
    });
  }

  if (!options.clipboardEvent?.clipboardData) {
    options.clipboardEvent?.preventDefault?.();
    return createQuireSelectionCommandHandledResult(options.commandRoute, {
      consumer,
      effect: options.clipboardEvent === undefined
        ? "copy-only"
        : "missing-clipboard-data",
      docChanged: false
    });
  }

  writeQuireSourceRangeClipboardData(
    options,
    guard.range,
    options.clipboardEvent.clipboardData
  );
  options.clipboardEvent.preventDefault?.();

  return createQuireSelectionCommandHandledResult(options.commandRoute, {
    consumer,
    effect: "copy-only",
    docChanged: false
  });
}

/**
 * Handles source-range cut by serializing and deleting the represented slice.
 *
 * @param options - Routed selection command context.
 * @param consumer - Stable consumer label for diagnostics.
 * @returns Document-change result when the source range was cut.
 */
export function dispatchQuireSourceRangeCutCommand(
  options: QuireSelectionDomainCommandDispatchOptions,
  consumer: string
): QuireSelectionCommandDispatchResult {
  const copyGuard = readQuireSourceRangeCommandGuard(
    options.commandRoute,
    "copyable"
  );
  const commandGuard = readQuireSourceRangeCommandGuard(
    options.commandRoute,
    "commandable"
  );
  const guardEffect = copyGuard.effect ?? commandGuard.effect;

  if (guardEffect !== undefined) {
    options.clipboardEvent?.preventDefault?.();
    return createQuireSelectionCommandHandledResult(options.commandRoute, {
      consumer,
      effect: guardEffect,
      docChanged: false
    });
  }

  if (copyGuard.range === undefined || commandGuard.range === undefined) {
    options.clipboardEvent?.preventDefault?.();
    return createQuireSelectionCommandHandledResult(options.commandRoute, {
      consumer,
      effect: "missing-command-source",
      docChanged: false
    });
  }

  if (!options.clipboardEvent?.clipboardData) {
    options.clipboardEvent?.preventDefault?.();
    return createQuireSelectionCommandHandledResult(options.commandRoute, {
      consumer,
      effect: "missing-clipboard-data",
      docChanged: false
    });
  }

  writeQuireSourceRangeClipboardData(
    options,
    copyGuard.range,
    options.clipboardEvent.clipboardData
  );
  options.clipboardEvent.preventDefault?.();

  const deleteResult = deleteQuireSourceRange(options, commandGuard.range);

  return createQuireSelectionCommandHandledResult(options.commandRoute, {
    consumer,
    effect: "document-change",
    docChanged: deleteResult.docChanged
  });
}

/**
 * Serializes a source range into all supported clipboard formats.
 *
 * @param options - Routed selection command context.
 * @param range - Source range to serialize.
 * @param clipboardData - Clipboard adapter receiving serialized formats.
 */
function writeQuireSourceRangeClipboardData(
  options: QuireSelectionDomainCommandDispatchOptions,
  range: QuireSourceRangeCommandRange,
  clipboardData: QuireClipboardData
): void {
  const slice = options.runtime.editor.state.doc.slice(range.from, range.to);
  const serialized = serializeQuireClipboardSlice({
    editor: options.runtime.editor,
    slice
  });

  clipboardData.setData(canvasInternalClipboardMime, serialized.internal);
  clipboardData.setData("text/html", serialized.html);
  clipboardData.setData("text/plain", serialized.plainText);
}
