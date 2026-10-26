import type { ActivityEvent, ActivityStore, VersionStore } from "../protocol/types";

/** Inputs every adapter under test must honor. */
export interface ConformanceEnvironment {
  /** @returns The controlled time the store must use for acceptance and compaction. */
  readonly now: () => Date;
  /** Access policy the adapter must apply for this test. */
  readonly canView: (viewer: string | undefined, event: ActivityEvent) => boolean;
}

/** One protocol rule, runnable under any test framework. */
export interface ConformanceCheck<Store> {
  /** Rule description. */
  readonly name: string;
  /**
   * Runs the rule against a fresh store; throws on a violation.
   * @param create - Factory returning an empty store bound to the environment.
   */
  readonly run: (create: (environment: ConformanceEnvironment) => Store | Promise<Store>) => Promise<void>;
}

/** Rules for activity stores. */
export type ActivityStoreCheck = ConformanceCheck<ActivityStore>;
/** Rules for version stores. */
export type VersionStoreCheck = ConformanceCheck<VersionStore>;
