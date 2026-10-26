/** How a pure table transform result is written into a transaction. */
export type WordTableStepGranularity = "minimal" | "whole-table";

/** One source-ordered relation between previous and next container children. */
export type WordTableChildAlignment =
  | {
      /** The next child is the identical previous instance. */
      readonly kind: "same";
      /** Previous child index. */
      readonly previousIndex: number;
      /** Next child index. */
      readonly nextIndex: number;
    }
  | {
      /** The next child continues the previous child with changed attrs or content. */
      readonly kind: "update";
      /** Previous child index. */
      readonly previousIndex: number;
      /** Next child index. */
      readonly nextIndex: number;
    }
  | {
      /** A contiguous previous run is replaced by a contiguous next run; either may be empty. */
      readonly kind: "gap";
      /** First replaced previous child index. */
      readonly previousFrom: number;
      /** Exclusive end of the replaced previous children. */
      readonly previousTo: number;
      /** First inserted next child index. */
      readonly nextFrom: number;
      /** Exclusive end of the inserted next children. */
      readonly nextTo: number;
    };
