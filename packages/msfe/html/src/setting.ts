import { definePresentationSetting } from "@quirekit/msfe-core";
import type { HtmlRendering } from "./types";

/** HTML policy preference; it never changes the fixed executable-content prohibition. */
export const renderingSetting = definePresentationSetting<HtmlRendering>((value): value is HtmlRendering => value === "source" || value === "safe");
