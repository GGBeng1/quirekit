import type { QuireKitTheme } from "../../theme";
import type {
  QuireKitTooltipContentOptions,
  QuireKitTooltipTokens
} from "./types";

/** Tooltip pointer/focus 触发前的默认短延迟。 */
export const defaultTooltipOpenDelay = 400;

/** Tooltip 离开 trigger 后的默认关闭缓冲。 */
export const defaultTooltipCloseDelay = 100;

/**
 * 从完整语义主题派生 Tooltip 组件 token。
 *
 * @param theme - 宿主已经解析完成的语义主题。
 * @returns 不可变的 Tooltip 组件 token。
 */
export function createTooltipTokens(
  theme: QuireKitTheme
): QuireKitTooltipTokens {
  const typography = theme.typography.compact;
  return Object.freeze({
    background: theme.color.surface.inverse,
    foreground: theme.color.text.inverse,
    borderColor: theme.color.surface.transparent,
    borderWidth: theme.borderWidth.none,
    radius: theme.radius.control,
    shadow: theme.elevation.overlay,
    paddingBlock: theme.spacing.inlineTight,
    paddingInline: theme.spacing.inline,
    gap: theme.spacing.inlineTight,
    arrowSize: theme.spacing.inline,
    typography: Object.freeze({
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      lineHeight: typography.lineHeight,
      fontWeight: typography.fontWeight,
      letterSpacing: typography.letterSpacing
    }),
    motionDuration: theme.motion.feedbackDuration,
    enterEasing: theme.motion.enterEasing,
    exitEasing: theme.motion.exitEasing,
    layer: theme.layer.tooltip
  });
}

/**
 * 解析 Tooltip 当前应显示的标签或禁用原因。
 *
 * 禁用原因只在 subject 确实不可用且原因非空时覆盖普通标签；这让
 * pointer、keyboard focus 与读屏描述消费同一份稳定文案。
 *
 * @param options - 普通标签、禁用原因与 subject 状态。
 * @returns 当前提示文案；没有可展示内容时返回 `undefined`。
 */
export function resolveTooltipContent(
  options: QuireKitTooltipContentOptions
): string | undefined {
  const content = normalizeContent(options.content);
  const disabledReason = normalizeContent(options.disabledReason);
  if (options.subjectDisabled && disabledReason !== undefined) {
    return disabledReason;
  }
  return content;
}

/**
 * 把空白文案归一化为缺失值，同时保留有效文案的原始内容。
 *
 * @param content - 待归一化的可选文案。
 * @returns 有效文案或 `undefined`。
 */
function normalizeContent(content: string | undefined): string | undefined {
  return content?.trim() ? content : undefined;
}
