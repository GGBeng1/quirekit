/** Version list and preview chrome, independent of document content. */
export const versionLabels = {
  "zh-CN": { records: "记录", versions: "版本", view: "查看", name: "版本名称（可选）", save: "保存版本", saveFailed: "版本保存失败。",
    empty: "暂无版本", failed: "版本加载失败。", retry: "重试", more: "加载更多", trigger: { auto: "自动保存", named: "命名版本", restore: "恢复后的版本", import: "导入的版本" },
    preview: "预览", compare: "与当前对比", compareHint: "红色为当前内容，绿色为此版本内容；恢复后文档将与此版本一致。", same: "此版本与当前内容相同。",
    copy: "复制全文", copied: "已复制", restore: "恢复此版本", close: "关闭", loading: "正在读取版本…", missing: "版本已不存在。",
    restoreHint: "恢复前会先把当前内容保存为一个版本，随时可以恢复回来。",
    refused: { unavailable: "未配置版本存储。", readonly: "当前文档只读，无法恢复。", missing: "版本已不存在。", format: "不支持此版本的格式。", rejected: "恢复失败，请重试。" } },
  en: { records: "Activity", versions: "Versions", view: "View", name: "Version name (optional)", save: "Save version", saveFailed: "Could not save the version.",
    empty: "No versions yet", failed: "Could not load versions.", retry: "Retry", more: "Load more", trigger: { auto: "Autosave", named: "Named version", restore: "Restored version", import: "Imported version" },
    preview: "Preview", compare: "Compare with current", compareHint: "Red is the current content, green is this version; restoring makes the document match this version.", same: "This version matches the current content.",
    copy: "Copy all", copied: "Copied", restore: "Restore this version", close: "Close", loading: "Reading the version…", missing: "The version no longer exists.",
    restoreHint: "The current content is saved as a version first, so you can always go back.",
    refused: { unavailable: "No version store is configured.", readonly: "The document is read-only.", missing: "The version no longer exists.", format: "This version's format is not supported.", rejected: "Could not restore; try again." } },
} as const;
