/** Mutable identities observed across one producer's layer declarations. */
export interface QuireLayerContributionValidationState {
  /** Contribution ids already observed. */
  readonly contributionIds: Set<string>;
  /** Command ids already observed, including nested clips. */
  readonly commandIds: Set<string>;
  /** DOM overlay ids already observed. */
  readonly overlayIds: Set<string>;
  /** Interaction target ids already observed. */
  readonly targetIds: Set<string>;
}

/**
 * Creates empty duplicate-id indexes for one producer compilation.
 *
 * @returns Mutable validation state scoped to one producer.
 */
export function createQuireLayerContributionValidationState(): QuireLayerContributionValidationState {
  return {
    contributionIds: new Set(),
    commandIds: new Set(),
    overlayIds: new Set(),
    targetIds: new Set()
  };
}

/**
 * Copies a producer's duplicate-id indexes so a deferred body validates against them in isolation.
 *
 * @param state - Producer-scoped indexes after its eager contributions were validated.
 * @returns Independent copy.
 */
export function cloneQuireLayerContributionValidationState(
  state: QuireLayerContributionValidationState
): QuireLayerContributionValidationState {
  return {
    contributionIds: new Set(state.contributionIds),
    commandIds: new Set(state.commandIds),
    overlayIds: new Set(state.overlayIds),
    targetIds: new Set(state.targetIds)
  };
}
