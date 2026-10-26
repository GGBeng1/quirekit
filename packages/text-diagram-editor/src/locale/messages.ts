/** @param locale - Host language. @returns All feature-owned interface labels. */
export function textDiagramMessages(locale = "zh-CN") {
  return /^en(?:-|$)/iu.test(locale) ? {
    title: "Text diagram", language: "Language", template: "Template", apply: "Apply template", source: "Source", preview: "Preview",
    name: "Title", cancel: "Cancel", save: "Save diagram", loading: "Rendering…", empty: "Enter source to preview", retry: "Refresh preview",
    svg: "Download SVG", png: "Download PNG", local: "Rendered locally · source stays on this device", error: "Unable to render. Check the source and try again.",
    conflict: "The document changed. Your draft is still here.", readonly: "The document is now read-only. Your draft has not been saved.", missing: "The original target is no longer available. Your draft has not been saved.",
    composing: "Finish composing text before saving.",
    find: "Find / replace", sourceHint: "Tab to indent · Esc then Tab to leave · Ctrl/⌘ F to find",
    sourceLimit: "Source is limited to 30,000 characters. This edit was not applied.",
  } : {
    title: "文本绘图", language: "绘图语言", template: "模板", apply: "应用模板", source: "源码", preview: "预览",
    name: "标题", cancel: "取消", save: "保存图形", loading: "正在渲染…", empty: "输入源码后预览", retry: "刷新预览",
    svg: "下载 SVG", png: "下载 PNG", local: "本地渲染 · 源码不会上传", error: "绘图失败，请检查源码后重试。",
    conflict: "正文已被修改，当前草稿仍保留。", readonly: "正文已变为只读，当前草稿未提交。", missing: "原目标已被移除，当前草稿未提交。",
    composing: "请完成文字输入后再保存。",
    find: "查找替换", sourceHint: "Tab 缩进 · Esc 后按 Tab 移出 · Ctrl/⌘ F 查找",
    sourceLimit: "源码最多 30,000 个字符，本次修改未应用。",
  };
}
