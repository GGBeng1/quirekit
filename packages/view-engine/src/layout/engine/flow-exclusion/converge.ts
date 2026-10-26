import type { QuireBlockLayoutInput } from "../block-types";
import {
  resolveQuireBlockFlowAdditionalBefore,
  resolveQuireBlockFlowTrailingDistance
} from "@quirekit/layout/block-flow";
import {
  reflowInputAgainstActiveExclusions,
  resolveBlockInputExtent
} from "./reflow";
import { stabilizeOwnedBlockFlowPlacements } from "./pin";
import { collectScopeExclusions } from "./registry";

/** Inputs for one sibling-flow exclusion convergence pass. */
export interface ReflowQuireBlockFlowChildrenOptions {
  /** Direct child inputs in source order. */
  readonly children: readonly QuireBlockLayoutInput[];
  /** Shared inline extent of this block-flow scope. */
  readonly width: number;
  /** Gap inserted between sibling blocks. */
  readonly blockGap: number;
  /** Optional fragment/page body extent that bounds one exclusion occurrence. */
  readonly fragmentBlockSize?: number | undefined;
}

/**
 * Reflows direct sibling textblocks against baseline-pinned exclusions.
 *
 * The baseline pass discovers object geometry for the complete scope. Each
 * sibling then queries that immutable registry at its newly resolved block
 * offset. This lets objects constrain source content before their anchor while
 * preventing paragraph growth from moving the same object during the pass.
 * Provider and recursive children split the registry into independent stories.
 *
 * @param options - Sibling inputs, shared width, gap, and optional page extent.
 * @returns Inputs whose geometrically intersecting textblocks consume exact row slots.
 */
export function reflowQuireBlockFlowChildren(
  options: ReflowQuireBlockFlowChildrenOptions
): readonly QuireBlockLayoutInput[] {
  // Plain recursive block containers own normal sibling flows too. Prepare
  // their children before the current scope so section-wrapped body content
  // receives the same page-registry semantics as a flat document. Providers
  // remain opaque because their host invokes layoutQuireBlockContainer with
  // provider-owned constraints and story identity.
  const prepared = options.children.map((child) =>
    prepareRecursiveFlowInput(child, options)
  );
  const sourceChildren = prepared.every((child, index) => child === options.children[index])
    ? options.children
    : prepared;
  // Exclusions come only from direct children's own declarations. Without any,
  // every reflow and stabilization step below returns its input unchanged, so
  // skip the extent passes that would read every child's fragments.
  if (!sourceChildren.some((child) => (child.localFlowExclusions?.length ?? 0) > 0)) {
    return sourceChildren;
  }
  const scopeIds = resolveFlowScopeIds(sourceChildren);
  const baselineOffsets = resolveBlockOffsets(sourceChildren, options.blockGap);
  const exclusionsByScope = collectScopeExclusions({
    source: sourceChildren,
    scopeIds,
    blockOffsets: baselineOffsets,
    fragmentBlockSize: options.fragmentBlockSize
  });
  const reflowed = reflowChildrenAgainstPinnedExclusions(
    sourceChildren,
    scopeIds,
    exclusionsByScope,
    options
  );
  const finalOffsets = resolveBlockOffsets(reflowed, options.blockGap);

  // The ordinary baseline owns physical object placement. Rebase the layout-only
  // declarations after wrapping so an object's own exclusion cannot move the
  // object and leave stale slots at its former rows.
  return reflowed.map((input, index) => stabilizeOwnedBlockFlowPlacements(
    input,
    finalOffsets[index] ?? 0,
    exclusionsByScope.get(scopeIds[index] ?? -1) ?? []
  ));
}

/**
 * Shapes siblings in source order against one immutable placement registry.
 *
 * @param children - Baseline sibling inputs.
 * @param scopeIds - Independent flow-scope identity parallel to the inputs.
 * @param exclusionsByScope - Baseline-pinned exclusions for each scope.
 * @param options - Shared width, spacing, and fragment authority.
 * @returns Reflowed sibling inputs in source order.
 */
function reflowChildrenAgainstPinnedExclusions(
  children: readonly QuireBlockLayoutInput[],
  scopeIds: readonly number[],
  exclusionsByScope: ReturnType<typeof collectScopeExclusions>,
  options: ReflowQuireBlockFlowChildrenOptions
): readonly QuireBlockLayoutInput[] {
  const reflowed: QuireBlockLayoutInput[] = [];
  let nextY = 0;

  for (let index = 0; index < children.length; index += 1) {
    const input = children[index];
    if (input === undefined) continue;

    nextY += resolveQuireBlockFlowAdditionalBefore(input, children[index - 1]);
    const output = reflowInputAgainstActiveExclusions(
      input,
      exclusionsByScope.get(scopeIds[index] ?? -1) ?? [],
      nextY,
      options.width
    );
    reflowed.push(output);
    nextY += resolveBlockInputExtent(output)
      + resolveQuireBlockFlowTrailingDistance(output)
      + options.blockGap;
  }

  return reflowed;
}

/**
 * Prepares one ordinary recursive container as an independent flow scope.
 *
 * @param input - Current source block input.
 * @param options - Parent width, gap, and fragment boundary.
 * @returns Original input when its child flow is unchanged, otherwise a clone with converged child flow.
 */
function prepareRecursiveFlowInput(
  input: QuireBlockLayoutInput,
  options: ReflowQuireBlockFlowChildrenOptions
): QuireBlockLayoutInput {
  if (input.layoutProvider !== undefined || input.children === undefined) {
    return input;
  }

  const children = reflowQuireBlockFlowChildren({
    children: input.children,
    width: options.width,
    blockGap: options.blockGap,
    ...(options.fragmentBlockSize === undefined
      ? {}
      : { fragmentBlockSize: options.fragmentBlockSize })
  });
  return children === input.children ? input : { ...input, children };
}

/**
 * Assigns stable ids to sibling flow scopes separated by nested owners.
 *
 * @param children - Direct sibling inputs in source order.
 * @returns Scope id parallel to every child input.
 */
function resolveFlowScopeIds(
  children: readonly QuireBlockLayoutInput[]
): readonly number[] {
  const ids: number[] = [];
  let scopeId = 0;

  for (const child of children) {
    if (child.layoutProvider !== undefined || child.children !== undefined) {
      scopeId += 1;
      ids.push(scopeId);
      scopeId += 1;
    } else {
      ids.push(scopeId);
    }
  }

  return ids;
}

/**
 * Resolves current block-start offsets from one complete sibling shape pass.
 *
 * @param children - Currently shaped sibling inputs.
 * @param blockGap - Gap inserted after each sibling.
 * @returns Block-start offsets parallel to the inputs.
 */
function resolveBlockOffsets(
  children: readonly QuireBlockLayoutInput[],
  blockGap: number
): readonly number[] {
  const offsets: number[] = [];
  let nextY = 0;

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child === undefined) continue;
    nextY += resolveQuireBlockFlowAdditionalBefore(child, children[index - 1]);
    offsets.push(nextY);
    nextY += resolveBlockInputExtent(child)
      + resolveQuireBlockFlowTrailingDistance(child)
      + blockGap;
  }

  return offsets;
}
