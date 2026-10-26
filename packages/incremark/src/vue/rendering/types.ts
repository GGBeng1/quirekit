import type { VNodeChild } from "vue";
import type { ReadingContext as CoreContext, ReadingProjection as CoreProjection } from "@quirekit/incremark-core";
/** Vue projection context over the canonical source. */
export type ReadingContext = CoreContext<VNodeChild>;
/** Vue block retention/instrumentation boundary. */
export type ReadingProjection = CoreProjection<VNodeChild>;
