import type { QuireStructuredRangePlan } from "../types";

/** Result of mapping a durable structured range plan. */
export interface QuireMappedStructuredRangePlan {
  /** Mapped plan when semantic coverage remains representable. */
  readonly plan: QuireStructuredRangePlan | null;
  /** Position used when semantic mapping requests nearest fallback. */
  readonly nearestPosition: number | null;
}
