/** Carousel 的界面文案。 */
export interface Messages {
  /** 上一页按钮的可访问名称。 */
  readonly previous: string;
  /** 下一页按钮的可访问名称。 */
  readonly next: string;
  /** 页面指示器组的可访问名称。 */
  readonly pages: string;
  /** 单个页面指示器的名称；page 从 0 开始。 */
  readonly page: (page: number) => string;
  /** 单张内容的名称；index 从 0 开始，label 为内容标签。 */
  readonly slide: (label: string, index: number, count: number) => string;
  /** 没有内容时的提示。 */
  readonly empty: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  previous: "上一页",
  next: "下一页",
  pages: "选择页面",
  page: page => `转到第 ${page + 1} 页`,
  slide: (label, index, count) => `${label}，${index + 1} / ${count}`,
  empty: "暂无内容"
};

/** English. */
export const en: Messages = {
  previous: "Previous page",
  next: "Next page",
  pages: "Choose page",
  page: page => `Go to page ${page + 1}`,
  slide: (label, index, count) => `${label}, ${index + 1} of ${count}`,
  empty: "No content"
};
