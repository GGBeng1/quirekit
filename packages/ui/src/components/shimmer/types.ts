/** 通过轻量文字扫光表示进行中，不持有请求或计时状态。 */
export interface QuireKitShimmerProps {
  /** 只渲染一次的可读纯文本，不解析 HTML。 */
  readonly text: string;
  /** 是否扫光；关闭及系统减少动效时保留静态文本。 */
  readonly active?: boolean;
  /** 单次扫光毫秒数；仅接受正有限数，省略或无效时使用主题动效时长。 */
  readonly duration?: number;
}
