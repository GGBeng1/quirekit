import type { QuireRetainedRegionProductGap } from "../declaration/types";
import type { QuireLayerContributionBody } from "./types";

/** Keys holding renderer artifacts; every other own key belongs to the eager header. */
const bodyKeys = ["commands", "domOverlays", "targets"] as const;

/** Declaration or compiled contribution: artifacts are optional on one, required on the other. */
type QuireLayerContributionBodyHolder = {
  readonly [Key in keyof QuireLayerContributionBody]?: QuireLayerContributionBody[Key] | undefined;
};

/** Realization record of one deferred contribution object. */
interface QuireDeferredLayerContributionState {
  /** Produces the body; dropped once it has run so intermediate stages can be collected. */
  produce: (() => QuireLayerContributionBody) | undefined;
  /** Body produced by the first read. */
  body: QuireLayerContributionBody | undefined;
}

/** Deferred contribution objects and their realization state; weak so snapshots stay collectable. */
const deferredStates = new WeakMap<object, QuireDeferredLayerContributionState>();
/** Gaps found while realizing a deferred body, keyed by the contribution that produced them. */
const realizationGaps = new WeakMap<object, readonly QuireRetainedRegionProductGap[]>();
/** Deferred contribution each rewritten deferred contribution was derived from. */
const origins = new WeakMap<object, object>();
/** Disabled only by tests that compare deferred bodies with eager compilation. */
let deferralEnabled = true;

/**
 * Reports whether runtime-activated contributions defer their artifacts.
 *
 * @returns False only while a test forces eager compilation.
 */
export function isQuireLayerContributionDeferralEnabled(): boolean {
  return deferralEnabled;
}

/**
 * Forces eager or deferred artifacts for runtime-activated contributions.
 *
 * @param enabled - False makes every later compilation produce its body immediately.
 */
export function setQuireLayerContributionDeferralForTest(enabled: boolean): void {
  deferralEnabled = enabled;
}

/**
 * Creates a contribution whose artifacts are produced on first read and then kept.
 *
 * Reading any of `commands`, `domOverlays` or `targets` realizes all three. The header must
 * already hold every fact used for activation, ownership, ordering and clipping decisions.
 *
 * @param header - Eager identity and geometry facts, without artifact keys.
 * @param produce - Pure function of values captured when the contribution was compiled.
 * @returns Contribution object exposing the artifacts as lazily realized fields.
 */
export function deferQuireLayerContributionBody<Contribution extends QuireLayerContributionBodyHolder>(
  header: Omit<Contribution, keyof QuireLayerContributionBody>,
  produce: () => QuireLayerContributionBody
): Contribution {
  const state: QuireDeferredLayerContributionState = { produce, body: undefined };
  const realize = (): QuireLayerContributionBody => {
    if (state.body === undefined) {
      const run = state.produce!;
      state.produce = undefined;
      state.body = run();
    }
    return state.body;
  };
  const contribution = { ...header } as Contribution;
  for (const key of bodyKeys) {
    Object.defineProperty(contribution, key, { enumerable: true, get: () => realize()[key] });
  }
  deferredStates.set(contribution, state);
  return contribution;
}

/**
 * Reports whether a contribution's artifacts have not been produced yet.
 *
 * A pending body was never painted and never exposed interaction targets, so consumers that
 * clean up or look up previously realized artifacts may skip it.
 *
 * @param contribution - Declaration or compiled contribution.
 * @returns True for a deferred contribution whose body was never read.
 */
export function isQuireLayerContributionBodyPending(contribution: object): boolean {
  const state = deferredStates.get(contribution);
  return state !== undefined && state.body === undefined;
}

/**
 * Applies an artifact rewrite now, or when a deferred contribution is first read.
 *
 * The header overrides are applied eagerly in both cases. An eager contribution keeps its own
 * key order, so existing consumers observe the same object shape as a plain spread.
 *
 * @param contribution - Declaration or compiled contribution to rewrite.
 * @param overrides - Header fields replaced by this stage.
 * @param rewrite - Pure artifact rewrite of the stage; it must not read mutable state.
 * @returns Rewritten contribution, deferred when the input was deferred.
 */
export function rewriteQuireLayerContributionBody<Contribution extends QuireLayerContributionBodyHolder>(
  contribution: Contribution,
  overrides: Partial<Omit<Contribution, keyof QuireLayerContributionBody>>,
  rewrite: (body: QuireLayerContributionBody) => QuireLayerContributionBody
): Contribution {
  if (!deferredStates.has(contribution)) {
    return { ...contribution, ...overrides, ...rewrite(readQuireLayerContributionBody(contribution)) };
  }
  const rewritten = deferQuireLayerContributionBody<Contribution>(
    { ...readQuireLayerContributionHeader(contribution), ...overrides },
    () => rewrite(readQuireLayerContributionBody(contribution))
  );
  origins.set(rewritten, contribution);
  return rewritten;
}

/**
 * Reads the artifacts, realizing a deferred body.
 *
 * @param contribution - Declaration or compiled contribution.
 * @returns Complete artifacts; absent declaration fields read as empty.
 */
export function readQuireLayerContributionBody(
  contribution: QuireLayerContributionBodyHolder
): QuireLayerContributionBody {
  return {
    commands: contribution.commands ?? [],
    domOverlays: contribution.domOverlays ?? [],
    targets: contribution.targets ?? []
  };
}

/**
 * Copies the eager header without reading, and so without realizing, the artifacts.
 *
 * @param contribution - Declaration or compiled contribution.
 * @returns Own fields other than the artifacts.
 */
export function readQuireLayerContributionHeader<Contribution extends QuireLayerContributionBodyHolder>(
  contribution: Contribution
): Omit<Contribution, keyof QuireLayerContributionBody> {
  const header: Record<string, unknown> = {};
  for (const key of Object.keys(contribution)) {
    if (!(bodyKeys as readonly string[]).includes(key)) {
      header[key] = (contribution as Record<string, unknown>)[key];
    }
  }
  return header as Omit<Contribution, keyof QuireLayerContributionBody>;
}

/**
 * Records gaps found while realizing a deferred body.
 *
 * @param contribution - Contribution whose realization failed validation.
 * @param gaps - Validation gaps; the realized body is empty.
 */
export function recordQuireLayerContributionRealizationGaps(
  contribution: object,
  gaps: readonly QuireRetainedRegionProductGap[]
): void {
  realizationGaps.set(contribution, gaps);
}

/**
 * Reads gaps found while realizing a deferred body.
 *
 * @param contribution - Compiled contribution, or one rewritten from it by a later stage.
 * @returns Gaps of a failed realization, empty when none failed or the body is still pending.
 */
export function readQuireLayerContributionRealizationGaps(
  contribution: object
): readonly QuireRetainedRegionProductGap[] {
  for (let current: object | undefined = contribution; current !== undefined; current = origins.get(current)) {
    const gaps = realizationGaps.get(current);
    if (gaps !== undefined) return gaps;
  }
  return [];
}
