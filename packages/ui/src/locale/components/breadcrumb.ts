/** Breadcrumb interface text. */
export interface Messages {
  /** Landmark name when the host gives no ariaLabel. */
  readonly label: string;
  /** Name of the hidden-level trigger and its popover. */
  readonly overflow: string;
  /** Accessible name of the overflow popover's close button. */
  readonly closeOverflow: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = { label: "面包屑导航", overflow: "更多层级", closeOverflow: "关闭层级列表" };

/** English. */
export const en: Messages = { label: "Breadcrumb", overflow: "More levels", closeOverflow: "Close level list" };
