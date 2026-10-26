import { forwardQuireLayoutSignature } from "./signature";
import { containsSpecializedBlock, resolveSpecializedBlock } from "./specialization";
import {
  measureBlockFlowTextFragments,
  translateBlockFlowTextFragments
} from "./text-placement";
import type {
  LayoutQuireBlockFlowContainerOptions,
  LayoutQuireBlockFlowInputOptions,
  QuireBlockFlowBox,
  QuireBlockFlowCacheKey,
  QuireBlockFlowContainer,
  QuireBlockFlowInput
} from "./types";

/** Internal callback that lays out one recursive container. */
export type LayoutBlockFlowContainer<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
> = (
  options: LayoutQuireBlockFlowContainerOptions<Input, Box>
) => QuireBlockFlowContainer<Box>;

/**
 * Lays out one block input with optional exact cache reuse.
 *
 * @param options - Input geometry and typed consumer services.
 * @param layoutContainer - Recursive container callback.
 * @param readCache - Whether the current input may read and store its cache entry.
 * @returns Consumer-decorated block result.
 */
export function layoutBlockFlowInputInternal<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(
  options: LayoutQuireBlockFlowInputOptions<Input, Box>,
  layoutContainer: LayoutBlockFlowContainer<Input, Box>,
  readCache: boolean
): Box {
  const specialized = resolveSpecializedBlock(options);
  if (specialized !== undefined) {
    return specialized;
  }

  const cacheable = readCache && !containsSpecializedBlock(options.input, options);
  const key: QuireBlockFlowCacheKey = {
    x: options.x,
    y: options.y,
    width: options.width,
    blockHeight: options.blockHeight,
    blockGap: options.blockGap,
    fragmentBlockSize: options.fragmentBlockSize
  };
  if (cacheable) {
    const cached = options.cache?.get(options.input, key);
    if (cached !== undefined) {
      return cached;
    }
  }

  const box = layoutGenericBlockFlowInput(options, layoutContainer);
  if (cacheable) {
    options.cache?.set(options.input, key, box, options.dirtyRange);
  }
  return box;
}

/** Lays out a generic recursive container or leaf input. */
function layoutGenericBlockFlowInput<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(
  options: LayoutQuireBlockFlowInputOptions<Input, Box>,
  layoutContainer: LayoutBlockFlowContainer<Input, Box>
): Box {
  const minHeight = options.input.minHeight ?? options.blockHeight;
  const childInputs = options.resolveChildren(options.input);
  if (childInputs !== undefined && childInputs.length > 0) {
    const container = layoutContainer({
      id: options.input.id,
      range: options.input.range,
      rect: { x: options.x, y: options.y, width: options.width, height: minHeight },
      blockHeight: options.blockHeight,
      blockGap: options.blockGap,
      fragmentBlockSize: options.fragmentBlockSize,
      children: childInputs,
      cache: options.cache,
      dirtyRange: options.dirtyRange,
      resolveChildren: options.resolveChildren,
      isSpecialized: options.isSpecialized,
      layoutSpecialized: options.layoutSpecialized,
      decorateBox: options.decorateBox
    });
    const height = Math.max(minHeight, container.rect.height);
    const neutral: QuireBlockFlowBox & { readonly children: readonly Box[] } = {
      ...container,
      rect: { ...container.rect, height },
      ...(options.input.textFragments === undefined
        ? {}
        : {
            inlineLayoutRect: {
              x: options.x,
              y: options.y,
              width: options.width,
              height
            },
            textFragments: translateBlockFlowTextFragments(
              options.input.textFragments,
              options.x,
              options.y,
              options.cache
            )
          }),
      ...(options.input.textRuns === undefined ? {} : { textRuns: options.input.textRuns }),
      ...(options.input.sourceAnchors === undefined
        ? {}
        : { sourceAnchors: options.input.sourceAnchors }),
      ...(options.input.pagination === undefined
        ? {}
        : { pagination: options.input.pagination })
    };
    return forwardQuireLayoutSignature(
      options.decorateBox(options.input, neutral),
      options.input
    );
  }

  const textLayout = measureBlockFlowTextFragments(
    options.input.textFragments,
    options.x,
    options.y,
    options.cache
  );
  const height = Math.max(minHeight, textLayout.textHeight);
  const neutral: QuireBlockFlowBox = {
    id: options.input.id,
    range: options.input.range,
    rect: { x: options.x, y: options.y, width: options.width, height },
    inlineLayoutRect: { x: options.x, y: options.y, width: options.width, height },
    ...(textLayout.textFragments === undefined
      ? {}
      : { textFragments: textLayout.textFragments }),
    ...(options.input.textRuns === undefined ? {} : { textRuns: options.input.textRuns }),
    ...(options.input.sourceAnchors === undefined
      ? {}
      : { sourceAnchors: options.input.sourceAnchors }),
    ...(options.input.pagination === undefined
      ? {}
      : { pagination: options.input.pagination })
  };
  return forwardQuireLayoutSignature(
    options.decorateBox(options.input, neutral),
    options.input
  );
}
