/** Toast 可用的内建状态。 */
export type QuireKitToastType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "loading";

/** Toast 的内建视觉外观。 */
export type QuireKitToastAppearance = "outline" | "accent";

/** Toast 组相对视口的停靠位置。 */
export type QuireKitToastPlacement =
  | "top-start"
  | "top"
  | "top-end"
  | "bottom-start"
  | "bottom"
  | "bottom-end";

/** Toast 生命周期中的公开可见状态。 */
export type QuireKitToastStatus = "visible" | "dismissing" | "unmounted";
