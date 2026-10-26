import { createQuireDocumentNodeId } from "@quirekit/view-engine";
import {
  createQuireMarkStyleResolver,
  createQuireNodeTextStyleResolver,
  resolveQuireTextblockShapingSource
} from "@quirekit/view-engine";
import { createQuireEditorLayoutProviderRegistry } from "@quirekit/view-engine";
import { compileQuireBackgroundShapingBatch } from "./attachments";
import type {
  CompileQuireEditorBackgroundShapingOptions,
  QuireBackgroundShapingAttachmentInput,
  QuireBackgroundShapingCompilationGap,
  QuireEditorBackgroundShapingCompilation
} from "./types";

/**
 * Compiles top-level editor blocks into pure clone-safe shaping work.
 *
 * Extension callbacks run only during this main-thread compilation phase. The
 * resulting payload contains resolved runs and metrics; provider-owned and
 * structured blocks stay on canonical main-thread layout with explicit gaps.
 *
 * @param options - Editor range, base metrics, runtime capabilities, and cache.
 * @returns Request-local shaping batch, cache hits, and unsupported block gaps.
 */
export function compileQuireEditorBackgroundShaping(
  options: CompileQuireEditorBackgroundShapingOptions
): QuireEditorBackgroundShapingCompilation {
  const state = options.editor.state;
  const providerRegistry = createQuireEditorLayoutProviderRegistry(
    options.editor.extensionManager
  );
  const resolveNodeQuireTextStyle = options.resolveNodeQuireTextStyle
    ?? createQuireNodeTextStyleResolver(
      state,
      options.font,
      options.applyDocumentFontTheme ?? false
    );
  const resolveMarkQuireStyle = options.resolveMarkQuireStyle
    ?? createQuireMarkStyleResolver(state);
  const attachments: QuireBackgroundShapingAttachmentInput[] = [];
  const gaps: QuireBackgroundShapingCompilationGap[] = [];
  let cachedBlockCount = 0;

  state.doc.forEach((node, offset, blockIndex) => {
    if (blockIndex < options.fromIndex || blockIndex >= options.toIndex) {
      return;
    }
    const provider = providerRegistry.resolve(node.type.name);
    if (provider !== undefined) {
      gaps.push({
        code: "provider-owned",
        blockIndex,
        nodeType: node.type.name,
        message: `Layout provider "${provider.id}" owns node type "${node.type.name}".`
      });
      return;
    }
    if (!node.isTextblock) {
      gaps.push({
        code: "non-textblock",
        blockIndex,
        nodeType: node.type.name,
        message: `Node type "${node.type.name}" requires structured main-thread layout.`
      });
      return;
    }

    const id = createQuireDocumentNodeId(node, [blockIndex]);
    const contentStart = offset + 1;
    const contentEnd = Math.max(offset + node.nodeSize - 1, contentStart);
    if (options.cache.get(node, options.width, contentStart) !== undefined) {
      cachedBlockCount += 1;
      return;
    }
    const source = resolveQuireTextblockShapingSource({
      node,
      contentStart,
      contentEnd,
      sourceId: id,
      font: options.font,
      lineHeight: options.lineHeight,
      textBaselineOffset: options.textBaselineOffset,
      resolveNodeQuireTextStyle,
      resolveMarkQuireStyle
    });
    if (source.runs.length === 0) {
      gaps.push({
        code: "empty-textblock",
        blockIndex,
        nodeType: node.type.name,
        message: `Empty textblock "${id}" uses the canonical zero-width caret anchor.`
      });
      return;
    }

    attachments.push({
      node,
      contentStart,
      block: {
        attachmentKey: id,
        id,
        runs: source.runs,
        width: options.width,
        lineHeight: source.metrics.lineHeight,
        textBaselineOffset: source.metrics.baselineOffset,
        lineBreakMode: options.lineBreakMode,
        baseDirection: source.baseDirection
      }
    });
  });

  return {
    batch: compileQuireBackgroundShapingBatch({
      capabilities: options.capabilities,
      attachments
    }),
    gaps,
    cachedBlockCount
  };
}
