import type {
  QuireLayoutProviderContext,
  QuireLayoutProviderGap,
  QuireLayoutProviderResult,
  QuireLayoutProviderValidation,
  ValidateQuireLayoutProviderResultOptions
} from "./types";
import type {
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import { collectQuireProviderChildFragments, collectQuireProviderChildProducts } from "./children";

/**
 * Validates provider output against the framework-owned execution context.
 *
 * Validation never repairs output or invents identity. Rejected facts become
 * explicit gaps and the original result remains unavailable to canonical
 * consumers.
 *
 * @param options - Authoritative context and provider result.
 * @returns Accepted result or explicit validation gaps.
 */
export function validateQuireLayoutProviderResult(
  options: ValidateQuireLayoutProviderResultOptions
): QuireLayoutProviderValidation {
  const { context, result } = options;
  const gaps: QuireLayoutProviderGap[] = [];

  if (result.snapshotVersion !== context.snapshotVersion) {
    gaps.push(createGap(
      context,
      "stale-snapshot-version",
      `Provider result snapshot ${result.snapshotVersion} does not match active snapshot ${context.snapshotVersion}.`
    ));
  }

  if (result.providerId !== context.providerId) {
    gaps.push(createGap(
      context,
      "provider-id-mismatch",
      `Provider result owner "${result.providerId}" does not match "${context.providerId}".`
    ));
  }

  if (!sameSource(result.source, context.source)) {
    gaps.push(createGap(
      context,
      "source-identity-mismatch",
      `Provider result source "${result.source.sourceId}" does not match "${context.source.sourceId}".`
    ));
  }

  validateLayoutContribution(context, result, gaps);

  const rootId = context.root.id.value;
  const root = result.products.roots.find((entry) => entry.id.value === rootId);
  if (root === undefined || !sameSource(root.source, context.source)) {
    gaps.push(createGap(
      context,
      "root-identity-mismatch",
      `Provider result does not contain authoritative root "${rootId}".`,
      { rootId }
    ));
  }

  const regionId = context.region.regionId.value;
  const region = result.products.regions.find((entry) =>
    entry.ref.rootId.value === rootId
    && entry.ref.regionId.value === regionId
  );
  if (region === undefined || !sameSource(region.source, context.source)) {
    gaps.push(createGap(
      context,
      "region-identity-mismatch",
      `Provider result does not contain authoritative region "${regionId}" in root "${rootId}".`,
      { rootId, regionId }
    ));
  }

  if (context.visualInstance.kind === "repeated" && region !== undefined) {
    const actual = region.ref.visualInstanceId;
    if (actual === undefined) {
      gaps.push(createGap(
        context,
        "missing-visual-instance",
        `Repeated provider region "${regionId}" is missing visual-instance identity.`,
        { rootId, regionId }
      ));
    } else if (actual !== context.visualInstance.visualInstanceId) {
      gaps.push(createGap(
        context,
        "visual-instance-mismatch",
        `Provider region visual instance "${actual}" does not match "${context.visualInstance.visualInstanceId}".`,
        { rootId, regionId }
      ));
    }
  }

  if (result.continuation !== null) {
    if (result.continuation.providerId !== context.providerId) {
      gaps.push(createGap(
        context,
        "continuation-provider-mismatch",
        `Continuation owner "${result.continuation.providerId}" does not match "${context.providerId}".`
      ));
    }

    if (result.continuation.snapshotVersion !== context.snapshotVersion) {
      gaps.push(createGap(
        context,
        "stale-continuation-version",
        `Continuation snapshot ${result.continuation.snapshotVersion} does not match active snapshot ${context.snapshotVersion}.`
      ));
    }

    if (!sameSource(result.continuation.source, context.source)) {
      gaps.push(createGap(
        context,
        "continuation-source-mismatch",
        `Continuation source "${result.continuation.source.sourceId}" does not match "${context.source.sourceId}".`
      ));
    }
  }

  // 子区域已经由框架编译并安装；校验沿用这些身份，不把子控件重新挂到外层容器。
  const nestedProducts = collectQuireProviderChildProducts(result.layout);
  for (const gap of nestedProducts?.gaps ?? []) {
    gaps.push({ ...createGap(context, "retained-region-product-gap", gap.message, {
      ...(gap.regionId === undefined ? {} : { regionId: gap.regionId })
    }),
      retainedGapCode: gap.code,
    });
  }
  const fragmentRoots = [...result.products.roots, ...(nestedProducts?.roots ?? [])];
  const fragmentRegions = [...result.products.regions, ...(nestedProducts?.regions ?? [])];
  for (const fragment of result.fragments) {
    const geometry = fragment.geometry;
    const ownership = fragment.view.root.ownership;
    const sourceRange = context.source.range;
    if (
      sourceRange !== undefined
      && (
        !containsRange(sourceRange, geometry.root.range)
        || geometry.fragments.some((child) =>
          !containsRange(sourceRange, child.range)
        )
      )
    ) {
      gaps.push(createGap(
        context,
        "fragment-source-range-mismatch",
        `Provider fragment "${geometry.id}" escapes the authoritative source range.`,
        { fragmentId: geometry.id }
      ));
    }

    if (ownership.status !== "resolved") {
      gaps.push(createGap(
        context,
        "fragment-view-root-mismatch",
        `Provider fragment "${geometry.id}" has no resolved retained ownership.`,
        { fragmentId: geometry.id }
      ));
      continue;
    }

    const fragmentRootId = ownership.root.id.value;
    const fragmentRoot = fragmentRootId === undefined
      ? undefined
      : fragmentRoots.find((entry) => entry.id.value === fragmentRootId);
    if (fragmentRoot === undefined) {
      gaps.push(createGap(
        context,
        "fragment-view-root-mismatch",
        `Provider fragment "${geometry.id}" is owned by an undeclared retained root.`,
        { rootId: fragmentRootId }
      ));
      continue;
    }

    const fragmentRegion = ownership.owner.region;
    const regionProduct = fragmentRegions.find((entry) =>
      entry.ref.rootId.value === fragmentRegion.rootId.value
      && entry.ref.regionId.value === fragmentRegion.regionId.value
      && entry.ref.visualInstanceId === fragmentRegion.visualInstanceId
    );
    if (regionProduct === undefined) {
      gaps.push(createGap(
        context,
        "fragment-view-region-mismatch",
        `Provider fragment "${geometry.id}" is owned by an undeclared retained region.`,
        {
          rootId: fragmentRegion.rootId.value,
          regionId: fragmentRegion.regionId.value
        }
      ));
    }
  }

  return gaps.length === 0
    ? { valid: true, result }
    : { valid: false, gaps };
}

/**
 * Validates the renderer-neutral layout contribution against provider authority.
 *
 * @param context - Authoritative provider execution context.
 * @param result - Provider result carrying the layout contribution.
 * @param gaps - Mutable validation gap accumulator.
 */
function validateLayoutContribution(
  context: QuireLayoutProviderContext,
  result: QuireLayoutProviderResult,
  gaps: QuireLayoutProviderGap[]
): void {
  const layout = result.layout;
  const sourceRange = context.source.range;

  if (
    sourceRange === undefined
    || layout.range.from !== sourceRange.from
    || layout.range.to !== sourceRange.to
  ) {
    gaps.push(createGap(
      context,
      "layout-source-range-mismatch",
      "Provider layout contribution does not represent the authoritative source range."
    ));
  }

  if (layout.viewRoot?.id.value !== context.root.id.value) {
    gaps.push(createGap(
      context,
      "layout-root-identity-mismatch",
      `Provider layout contribution does not retain root "${context.root.id.value}".`,
      { rootId: layout.viewRoot?.id.value }
    ));
  }

  if (
    layout.viewRegion?.rootId.value !== context.region.rootId.value
    || layout.viewRegion?.regionId.value !== context.region.regionId.value
  ) {
    gaps.push(createGap(
      context,
      "layout-region-identity-mismatch",
      `Provider layout contribution does not retain region "${context.region.regionId.value}".`,
      {
        rootId: layout.viewRegion?.rootId.value,
        regionId: layout.viewRegion?.regionId.value
      }
    ));
  }

  if (layout.viewCapabilities !== context.root.capabilities) {
    gaps.push(createGap(
      context,
      "layout-capability-mismatch",
      "Provider layout contribution does not retain the authoritative capability set."
    ));
  }

  const { origin, inlineSize } = context.constraints;
  const right = layout.rect.x + layout.rect.width;
  if (
    layout.rect.x < origin.x
    || layout.rect.y !== origin.y
    || layout.rect.width < 0
    || layout.rect.height < 0
    || right > origin.x + inlineSize
  ) {
    gaps.push(createGap(
      context,
      "layout-constraint-mismatch",
      "Provider layout contribution escapes the authoritative block-flow constraints."
    ));
  }

  const retainedFragments = collectQuireProviderChildFragments(layout);
  const retainedIds = new Set(
    retainedFragments.map((fragment) => fragment.geometry.id)
  );
  const manifestIds = new Set(
    result.fragments.map((fragment) => fragment.geometry.id)
  );
  if (
    retainedIds.size !== manifestIds.size
    || [...retainedIds].some((fragmentId) => !manifestIds.has(fragmentId))
  ) {
    gaps.push(createGap(
      context,
      "layout-fragment-manifest-mismatch",
      "Provider layout contribution and fragment manifest describe different child-flow products."
    ));
  }
}

/**
 * Reports whether one document range fully contains another.
 *
 * @param outer - Authoritative containing range.
 * @param inner - Candidate provider range.
 * @returns Whether the candidate is contained by the authoritative range.
 */
function containsRange(
  outer: { readonly from: number; readonly to: number },
  inner: { readonly from: number; readonly to: number }
): boolean {
  return inner.from >= outer.from && inner.to <= outer.to;
}

/**
 * Reports whether two source identities name the same source and range.
 *
 * @param left - First source identity.
 * @param right - Second source identity.
 * @returns Whether both sources are equal.
 */
function sameSource(
  left: QuireLayoutSourceRef | undefined,
  right: QuireLayoutSourceRef
): boolean {
  if (left === undefined || left.sourceId !== right.sourceId) {
    return false;
  }

  if (left.range === undefined || right.range === undefined) {
    return left.range === right.range;
  }

  return left.range.from === right.range.from && left.range.to === right.range.to;
}

/**
 * Creates one provider validation gap with authoritative owner facts.
 *
 * @param context - Provider execution context.
 * @param code - Stable validation gap code.
 * @param message - Human-readable gap message.
 * @param identity - Optional root, region, and fragment identity.
 * @returns Provider validation gap.
 */
function createGap(
  context: QuireLayoutProviderContext,
  code: QuireLayoutProviderGap["code"],
  message: string,
  identity: {
    readonly rootId?: string | undefined;
    readonly regionId?: string | undefined;
    readonly fragmentId?: string | undefined;
  } = {}
): QuireLayoutProviderGap {
  return {
    code,
    message,
    providerId: context.providerId,
    sourceId: context.source.sourceId,
    ...identity
  };
}
