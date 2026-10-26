import { QuireLayoutJobExecutionError } from "../errors";
import type {
  CompileQuireBackgroundShapingBatchOptions,
  QuireBackgroundShapingAttachmentDiagnostics,
  QuireBackgroundShapingAttachmentInput,
  QuireBackgroundShapingJobOutput,
  QuireCompiledBackgroundShapingBatch
} from "./types";

/**
 * Compiles clone-safe shaping work while retaining node attachments locally.
 *
 * @param options - Runtime capabilities and main-thread node attachments.
 * @returns Clone-safe payload and accepted-output attachment authority.
 */
export function compileQuireBackgroundShapingBatch(
  options: CompileQuireBackgroundShapingBatchOptions
): QuireCompiledBackgroundShapingBatch {
  const attachmentByKey = new Map<string, QuireBackgroundShapingAttachmentInput>();

  for (const attachment of options.attachments) {
    if (attachmentByKey.has(attachment.block.attachmentKey)) {
      throw new QuireLayoutJobExecutionError(
        "invalid-payload",
        `Duplicate background shaping attachment key "${attachment.block.attachmentKey}".`
      );
    }
    attachmentByKey.set(attachment.block.attachmentKey, attachment);
  }

  return {
    payload: {
      capabilities: options.capabilities,
      blocks: options.attachments.map((attachment) => attachment.block)
    },
    attachAcceptedOutput(output, cache): QuireBackgroundShapingAttachmentDiagnostics {
      const outputsByKey = validateCompleteOutput(output, attachmentByKey);

      // Validate the complete batch before mutating the cache. A malformed or
      // partial Worker response can therefore never warm only half the nodes.
      for (const [attachmentKey, attachment] of attachmentByKey) {
        const blockOutput = outputsByKey.get(attachmentKey)!;
        cache.set(
          attachment.node,
          attachment.block.width,
          attachment.contentStart,
          blockOutput.fragments
        );
      }

      return { attachedBlockCount: attachmentByKey.size };
    }
  };
}

/**
 * Validates exact one-to-one attachment coverage before cache mutation.
 *
 * @param output - Accepted background shaping output.
 * @param attachments - Main-thread attachments expected by the request.
 * @returns Output blocks indexed by validated attachment key.
 */
function validateCompleteOutput(
  output: unknown,
  attachments: ReadonlyMap<string, QuireBackgroundShapingAttachmentInput>
): ReadonlyMap<string, QuireBackgroundShapingJobOutput["blocks"][number]> {
  if (
    typeof output !== "object"
    || output === null
    || !("blocks" in output)
    || !Array.isArray(output.blocks)
  ) {
    throw new QuireLayoutJobExecutionError(
      "invalid-payload",
      "Background shaping output requires a block array."
    );
  }
  const outputsByKey = new Map<
    string,
    QuireBackgroundShapingJobOutput["blocks"][number]
  >();

  for (const block of output.blocks) {
    if (
      typeof block !== "object"
      || block === null
      || !("attachmentKey" in block)
      || typeof block.attachmentKey !== "string"
      || !("fragments" in block)
      || !Array.isArray(block.fragments)
    ) {
      throw new QuireLayoutJobExecutionError(
        "invalid-payload",
        "Background shaping output contains an invalid block attachment."
      );
    }
    if (!attachments.has(block.attachmentKey)) {
      throw new QuireLayoutJobExecutionError(
        "invalid-payload",
        `Unknown background shaping attachment key "${block.attachmentKey}".`
      );
    }
    if (outputsByKey.has(block.attachmentKey)) {
      throw new QuireLayoutJobExecutionError(
        "invalid-payload",
        `Duplicate background shaping output key "${block.attachmentKey}".`
      );
    }
    outputsByKey.set(block.attachmentKey, block);
  }

  if (outputsByKey.size !== attachments.size) {
    throw new QuireLayoutJobExecutionError(
      "invalid-payload",
      "Background shaping output does not cover every request attachment."
    );
  }

  return outputsByKey;
}
