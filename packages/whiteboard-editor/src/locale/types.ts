import type { zhCN } from "./zh-cn";
/** Complete feature-owned interface catalogue, separate from canonical drawing data. */
export type WhiteboardMessages = { readonly [Key in keyof typeof zhCN]: string };
