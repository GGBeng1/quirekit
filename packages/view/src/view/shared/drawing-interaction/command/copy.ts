import type {
  DrawingCommandPaintIndicator,
  DrawingContextualCommandId,
  DrawingContextualCommandLocale,
  DrawingContextualMessages
} from "./types";

const commandLabels: Readonly<
  Record<
    DrawingContextualCommandLocale,
    Readonly<Record<DrawingContextualCommandId, string>>
  >
> = {
  "zh-CN": {
    layout: "文字环绕",
    fill: "形状填充",
    outline: "形状轮廓",
    "edit-text": "编辑文字",
    delete: "删除对象"
  },
  en: {
    layout: "Text wrapping",
    fill: "Shape fill",
    outline: "Shape outline",
    "edit-text": "Edit text",
    delete: "Delete object"
  }
};

const menuMessages: Readonly<
  Record<DrawingContextualCommandLocale, DrawingContextualMessages>
> = {
  "zh-CN": {
    objectLayout: "对象布局",
    inlineSection: "嵌入型",
    textWrappingSection: "文字环绕",
    inline: "嵌入型",
    square: "四周型",
    tight: "紧密型",
    through: "穿越型",
    topAndBottom: "上下型",
    behindText: "衬于文字下方",
    inFrontOfText: "浮于文字上方",
    moveWithText: "随文字移动",
    fixedOnPage: "固定在页面上",
    shapeFill: "形状填充",
    shapeOutline: "形状轮廓",
    noFill: "无填充",
    noOutline: "无轮廓",
    moreColors: "更多颜色",
    recentColors: "最近使用",
    width: "粗细",
    dash: "虚线",
    solid: "实线",
    dashLine: "虚线",
    dot: "点线",
    dashDot: "点划线"
  },
  en: {
    objectLayout: "Object layout",
    inlineSection: "Inline",
    textWrappingSection: "Text wrapping",
    inline: "Inline",
    square: "Square",
    tight: "Tight",
    through: "Through",
    topAndBottom: "Top and bottom",
    behindText: "Behind text",
    inFrontOfText: "In front of text",
    moveWithText: "Move with text",
    fixedOnPage: "Fix position on page",
    shapeFill: "Shape fill",
    shapeOutline: "Shape outline",
    noFill: "No fill",
    noOutline: "No outline",
    moreColors: "More colors",
    recentColors: "Recent colors",
    width: "Width",
    dash: "Dash",
    solid: "Solid",
    dashLine: "Dash",
    dot: "Dot",
    dashDot: "Dash dot"
  }
};

/**
 * Resolves drawing command language from the nearest mounted product boundary.
 *
 * @param host - Mounted overlay host nested under the product language root.
 * @returns Simplified Chinese for a Chinese ancestor, otherwise English.
 */
export function resolveDrawingContextualCommandLocale(
  host: HTMLElement
): DrawingContextualCommandLocale {
  const languageHost = host.closest("[lang]");
  const language = languageHost?.getAttribute("lang")
    ?? host.ownerDocument.documentElement.getAttribute("lang")
    ?? "en";
  return language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

/**
 * Resolves localized command and current-paint copy for tooltip and accessibility.
 *
 * @param locale - Mounted product language.
 * @param command - Stable semantic command id.
 * @param indicator - Optional live paint projected by fill or outline.
 * @returns Localized accessible command label.
 */
export function resolveDrawingContextualCommandLabel(
  locale: DrawingContextualCommandLocale,
  command: DrawingContextualCommandId,
  indicator?: DrawingCommandPaintIndicator
): string {
  const label = commandLabels[locale][command];
  if (indicator === undefined || (command !== "fill" && command !== "outline")) {
    return label;
  }
  if (indicator.kind === "solid") {
    return `${label}${locale === "zh-CN" ? "：" : ": "}${indicator.color.toUpperCase()}`;
  }
  const none = command === "fill"
    ? (locale === "zh-CN" ? "无填充" : "No fill")
    : (locale === "zh-CN" ? "无轮廓" : "No outline");
  return `${label}${locale === "zh-CN" ? "：" : ": "}${none}`;
}

/**
 * Resolves all selected-drawing menu copy for one mounted product locale.
 *
 * @param locale - Mounted product language.
 * @returns Complete localized menu messages.
 */
export function resolveDrawingContextualMessages(
  locale: DrawingContextualCommandLocale
): DrawingContextualMessages {
  return menuMessages[locale];
}
