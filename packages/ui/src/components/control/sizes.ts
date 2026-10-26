import type { QuireKitControlSize } from "./types";

/** 将公开 size 映射到已有语义 token，所有同排控件共用这份对应关系。 */
export const quireKitControlSizes = Object.freeze({
  xs: Object.freeze({ height: "compact", typography: "compact" }),
  sm: Object.freeze({ height: "default", typography: "compact" }),
  md: Object.freeze({ height: "regular", typography: "control" }),
  lg: Object.freeze({ height: "comfortable", typography: "control" }),
  xl: Object.freeze({ height: "large", typography: "control" })
} as const satisfies Record<QuireKitControlSize, { readonly height: string; readonly typography: string }>);
