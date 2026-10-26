import type { History } from "@antv/x6";
/** Public vendor callback contract; no private history implementation is imported. */
export type FlowHistoryOptions = NonNullable<ConstructorParameters<typeof History>[0]>;
