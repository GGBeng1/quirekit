import { containsSpecializedBlock } from "./specialization";
import {
  resolveQuireBlockFlowAdditionalBefore,
  resolveQuireBlockFlowTrailingDistance
} from "./spacing";
import type {
  LayoutQuireBlockFlowContainerOptions,
  LayoutQuireBlockFlowInputOptions,
  QuireBlockFlowBox,
  QuireBlockFlowContainer,
  QuireBlockFlowContainerCacheKey,
  QuireBlockFlowInput
} from "./types";

/** Internal callback that lays out one child input. */
export type LayoutBlockFlowChild<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
> = (options: LayoutQuireBlockFlowInputOptions<Input, Box>) => Box;

/**
 * Lays out one source-order block container with neutral cache reuse.
 *
 * @param options - Container geometry, children, cache, and typed services.
 * @param layoutChild - Recursive input layout callback supplied by the orchestrator.
 * @returns Canonical container geometry.
 */
export function layoutBlockFlowContainerInternal<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(
  options: LayoutQuireBlockFlowContainerOptions<Input, Box>,
  layoutChild: LayoutBlockFlowChild<Input, Box>
): QuireBlockFlowContainer<Box> {
  const children: Box[] = [];
  const cacheKey = createContainerCacheKey(options);
  const containsSpecialized = options.children.some((child) =>
    containsSpecializedBlock(child, options)
  );
  let nextY = options.rect.y;
  let childIndex = 0;
  let suffixAttempted = false;

  if (!containsSpecialized && options.dirtyRange != null) {
    const appended = options.cache?.appendContainerPrefix?.({
      key: cacheKey,
      children: options.children,
      dirtyRange: options.dirtyRange,
      target: children
    });
    if (appended !== undefined && appended.childCount > 0) {
      nextY = appended.nextY;
      childIndex = appended.childCount;
    } else if (options.cache?.appendContainerPrefix === undefined) {
      const reused = options.cache?.getContainerPrefix?.(
        cacheKey,
        options.children,
        options.dirtyRange
      );
      if (reused !== undefined && reused.childCount > 0) {
        children.push(...reused.children);
        nextY = reused.nextY;
        childIndex = reused.childCount;
      }
    }
  }

  for (; childIndex < options.children.length; childIndex += 1) {
    const child = options.children[childIndex]!;
    if (
      !containsSpecialized
      && !suffixAttempted
      && options.dirtyRange != null
      && child.range.from > options.dirtyRange.to
      && canAttemptContainerSuffix(child)
      && resolveQuireBlockFlowAdditionalBefore(
        child,
        options.children[childIndex - 1]
      ) === 0
    ) {
      suffixAttempted = true;
      const appended = options.cache?.appendContainerSuffix?.({
        key: cacheKey,
        children: options.children,
        startIndex: childIndex,
        nextY,
        dirtyRange: options.dirtyRange,
        target: children
      });
      if (appended !== undefined && appended.childCount > 0) {
        nextY = appended.nextY;
        childIndex += appended.childCount - 1;
        continue;
      }
      if (options.cache?.appendContainerSuffix === undefined) {
        const reused = options.cache?.getContainerSuffix?.(
          cacheKey,
          options.children,
          childIndex,
          nextY,
          options.dirtyRange
        );
        if (reused !== undefined && reused.childCount > 0) {
          children.push(...reused.children);
          nextY = reused.nextY;
          childIndex += reused.childCount - 1;
          continue;
        }
      }
    }

    const spacingBefore = resolveQuireBlockFlowAdditionalBefore(
      child,
      options.children[childIndex - 1]
    );
    if (spacingBefore > 0) {
      const previous = children[children.length - 1];
      if (previous !== undefined) {
        children[children.length - 1] = extendBlockHeight(previous, spacingBefore);
      }
      nextY += spacingBefore;
    }
    const childBox = layoutChild({
      input: child,
      x: options.rect.x,
      y: nextY,
      width: options.rect.width,
      blockHeight: options.blockHeight,
      blockGap: options.blockGap,
      fragmentBlockSize: options.fragmentBlockSize,
      cache: options.cache,
      dirtyRange: options.dirtyRange,
      resolveChildren: options.resolveChildren,
      isSpecialized: options.isSpecialized,
      layoutSpecialized: options.layoutSpecialized,
      decorateBox: options.decorateBox
    });
    const spacingAfter = resolveQuireBlockFlowTrailingDistance(child);
    const spaced = spacingAfter > 0
      ? extendBlockHeight(childBox, spacingAfter)
      : childBox;
    children.push(spaced);
    nextY += spaced.rect.height + options.blockGap;
  }

  const container: QuireBlockFlowContainer<Box> = {
    id: options.id,
    range: options.range,
    rect: {
      x: options.rect.x,
      y: options.rect.y,
      width: options.rect.width,
      height: children.length === 0
        ? 0
        : nextY - options.rect.y - options.blockGap
    },
    children
  };
  if (!containsSpecialized) {
    options.cache?.setContainer?.(cacheKey, options.children, container);
  }
  return container;
}

/** Creates the stable cache key for one block-flow container. */
function createContainerCacheKey<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(options: LayoutQuireBlockFlowContainerOptions<Input, Box>): QuireBlockFlowContainerCacheKey {
  return {
    id: options.id,
    x: options.rect.x,
    y: options.rect.y,
    width: options.rect.width,
    blockHeight: options.blockHeight,
    blockGap: options.blockGap,
    fragmentBlockSize: options.fragmentBlockSize
  };
}

/** Reports whether a clean child has enough metadata for suffix reuse. */
function canAttemptContainerSuffix(input: QuireBlockFlowInput): boolean {
  return input.estimated === true
    || Object.getOwnPropertyDescriptor(input, "layoutSignature") !== undefined;
}

/** Extends one consumer box downward without moving its content. */
function extendBlockHeight<Box extends QuireBlockFlowBox>(
  box: Box,
  extraHeight: number
): Box {
  return { ...box, rect: { ...box.rect, height: box.rect.height + extraHeight } };
}
