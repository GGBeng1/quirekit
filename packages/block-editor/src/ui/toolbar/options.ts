import { createEditorFontSizeOptions } from "@quirekit/editor-ui";

/** Explicit family names; browser fallback remains visible when a family is not installed. */
export const blockFontChoices = [
  { value: "font:default", label: "默认字体" },
  ...["Arial", "Calibri", "Times New Roman", "Georgia", "Verdana", "Courier New", "Noto Sans SC", "Noto Serif SC", "PingFang SC", "Songti SC", "SimSun", "SimHei", "Microsoft YaHei", "KaiTi", "FangSong", "serif", "sans-serif", "monospace"].map(family => ({ value: `font:${family}`, label: family, family }))
];

/** The same named and numeric point sizes used by Classic. */
export const blockSizeChoices = createEditorFontSizeOptions("zh-CN").map(option => ({ value: `size:${option.value}`, label: option.label }));

/** Block types already supported by the product's formatting commands. */
export const blockTypeChoices = [
  { value: "paragraph", label: "正文" },
  ...[1, 2, 3, 4, 5, 6].map(level => ({ value: `heading:${level}`, label: `标题 ${level}` })),
  { value: "codeBlock", label: "代码块" }
];
