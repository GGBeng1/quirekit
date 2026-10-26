/** Splitter 面板的排列与调整方向。 */
export type QuireKitSplitterOrientation = "horizontal" | "vertical";

/** Splitter 调整柄占用布局的视觉尺寸；pointer 命中区会被独立扩展。 */
export type QuireKitSplitterHandleSize = "sm" | "md";

/** Splitter 内置调整柄视觉，custom 由 handle 插槽完整接管。 */
export type QuireKitSplitterHandleVariant =
  | "line"
  | "hover-line"
  | "hover-bar"
  | "grip"
  | "custom";

/** 父容器变化时单个面板保留尺寸的策略。 */
export type QuireKitSplitterResizeBehavior =
  | "preserve-relative-size"
  | "preserve-pixel-size";

/** Splitter 中一个稳定面板的框架无关合同。 */
export interface QuireKitSplitterPanel {
  /** 面板稳定标识，同时参与调整柄和 DOM 标识。 */
  readonly id: string;
  /** 面板的可读名称，用于默认内容及相邻分隔条的可访问说明。 */
  readonly label?: string;
  /** 面板最小尺寸；数字表示百分比，也支持 CSS 像素字符串。 */
  readonly minSize?: number | string;
  /** 面板最大尺寸；数字表示百分比，也支持 CSS 像素字符串。 */
  readonly maxSize?: number | string;
  /** 是否允许通过公开命令折叠面板。 */
  readonly collapsible?: boolean;
  /** 面板折叠后的尺寸。 */
  readonly collapsedSize?: number | string;
  /** 父容器变化时保留相对尺寸或像素尺寸。 */
  readonly resizeBehavior?: QuireKitSplitterResizeBehavior;
}

/** panel 插槽接收的稳定面板上下文。 */
export interface QuireKitSplitterPanelSlotProps {
  /** 当前面板合同。 */
  readonly panel: QuireKitSplitterPanel;
  /** 当前面板在 DOM 中的位置。 */
  readonly index: number;
  /** 当前面板百分比尺寸。 */
  readonly size: number;
}

/** handle 插槽接收的稳定调整柄上下文。 */
export interface QuireKitSplitterHandleSlotProps {
  /** 调整柄之前的面板。 */
  readonly before: QuireKitSplitterPanel;
  /** 调整柄之后的面板。 */
  readonly after: QuireKitSplitterPanel;
  /** 调整柄在 DOM 中的位置。 */
  readonly index: number;
  /** 当前布局方向。 */
  readonly orientation: QuireKitSplitterOrientation;
}

/** Splitter 调整过程报告的稳定公开详情。 */
export interface QuireKitSplitterResizeDetails {
  /** 所有面板按 DOM 顺序排列的最新百分比尺寸。 */
  readonly sizes: readonly number[];
  /** 本次调整所使用的调整柄标识。 */
  readonly resizeTriggerId: string | null;
}

/** Splitter 面板展开或折叠后的稳定公开详情。 */
export interface QuireKitSplitterPanelChangeDetails {
  /** 状态发生变化的面板标识。 */
  readonly panelId: string;
  /** 变化后的面板百分比尺寸。 */
  readonly size: number;
}

/** Splitter 组件模板引用公开的命令。 */
export interface QuireKitSplitterHandle {
  /** 返回当前全部面板尺寸。 */
  readonly getSizes: () => number[];
  /** 设置全部面板尺寸。 */
  readonly setSizes: (sizes: number[]) => void;
  /** 恢复初始面板尺寸。 */
  readonly resetSizes: () => void;
  /** 折叠指定面板。 */
  readonly collapsePanel: (panelId: string) => void;
  /** 展开指定面板。 */
  readonly expandPanel: (panelId: string, minSize?: number) => void;
  /** 调整指定面板尺寸。 */
  readonly resizePanel: (panelId: string, size: number) => void;
}
