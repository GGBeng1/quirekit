import { definePresentationSetting } from "./settings";
import type { SourceRevealPolicy } from "./types";

/** Optional instance setting; absent settings retain MSFE's selection-based reveal. */
export const sourceRevealSetting = definePresentationSetting<SourceRevealPolicy>(
  /** @param value - Untrusted preference. @returns Whether the value is an explicit source visibility policy. */
  (value): value is SourceRevealPolicy => value === "selection" || value === "hidden",
);
