import { editorUnderlineStyleLabels } from "@quirekit/editor-ui";
import type { TextPanelMessage } from "./types";
/** Localized inspector copy; keys are stable across mounted theme changes. */
const textPanelCopy = {
  ...editorUnderlineStyleLabels,
  title: ["文本", "Text"], fonts: ["字体与字号", "Font"], eastAsia: ["中文字体", "East Asian font"], latin: ["西文字体", "Latin font"],
  size: ["字号", "Font size"], color: ["文字颜色", "Text color"], automatic: ["自动", "Automatic"], mixed: ["混合", "Mixed"],
  highlight: ["荧光笔", "Highlight"], noColor: ["无颜色", "No color"],
  formatting: ["字符格式", "Character formatting"], bold: ["加粗", "Bold"], italic: ["斜体", "Italic"], strike: ["删除线", "Strikethrough"],
  doubleStrike: ["双删除线", "Double strikethrough"], superscript: ["上标", "Superscript"], subscript: ["下标", "Subscript"],
  underline: ["下划线", "Underline"], underlineColor: ["线条颜色", "Line color"], emphasis: ["着重号", "Emphasis mark"],
  dot: ["圆点", "Dot"], underDot: ["下方圆点", "Dot below"], circle: ["空心圆", "Circle"], comma: ["逗号", "Comma"],
  effects: ["文字效果", "Text effects"], allCaps: ["全部大写字母", "All caps"], smallCaps: ["小型大写字母", "Small caps"],
  outline: ["轮廓", "Outline"], shadow: ["阴影", "Shadow"], emboss: ["浮雕", "Emboss"], imprint: ["凹印", "Imprint"],
  hidden: ["隐藏文字", "Hidden text"], hiddenDescription: ["在“视图”中开启“显示隐藏文字”可查看和取消隐藏。", "Use View → Show hidden text to reveal and unhide it."],
  scale: ["字符缩放", "Character scale"], restoreScale: ["恢复继承", "Restore inherited scale"],
  scaleDescription: ["100% 为正常宽度，只改变字宽。", "100% is normal width; only glyph width changes."],
  spacing: ["字符间距", "Character spacing"], unit: ["单位", "Unit"]
} as const satisfies Record<TextPanelMessage, readonly [string, string]>;
/** @param locale - Product locale. @param key - Message identity. @returns Localized text. */
export function textPanelMessage(locale: string, key: TextPanelMessage): string { return textPanelCopy[key][locale === "zh-CN" ? 0 : 1]; }

/** Localized names of the OOXML highlight tokens, as Word names them. */
const highlightColorCopy: Readonly<Record<string, readonly [string, string]>> = {
  yellow: ["黄色", "Yellow"], green: ["鲜绿", "Bright green"], cyan: ["青绿", "Turquoise"], magenta: ["粉红", "Pink"],
  blue: ["蓝色", "Blue"], red: ["红色", "Red"], darkBlue: ["深蓝", "Dark blue"], darkCyan: ["青色", "Teal"],
  darkGreen: ["绿色", "Green"], darkMagenta: ["紫罗兰", "Violet"], darkRed: ["深红", "Dark red"], darkYellow: ["深黄", "Dark yellow"],
  darkGray: ["灰色-50%", "Gray-50%"], lightGray: ["灰色-25%", "Gray-25%"], black: ["黑色", "Black"], white: ["白色", "White"]
};
/** @param locale - Product locale. @param token - Highlight token. @returns Localized color name, or the token itself when unknown. */
export function highlightColorName(locale: string, token: string): string {
  return highlightColorCopy[token]?.[locale === "zh-CN" ? 0 : 1] ?? token;
}
