/** Activity panel chrome, independent of document content. */
export const activityLabels = {
  "zh-CN": { title: "协作记录", member: "成员", everyone: "全部成员", period: "时间", periods: { all: "全部时间", week: "最近 7 天", month: "最近 30 天" }, system: "系统通知", local: "仅保存在本机的编辑记录，不代表多人可信记录。",
    empty: "暂无记录", location: { approximate: "原位置已变化，已定位到相同的内容。", deleted: "原内容已被删除。", unavailable: "无法确定原位置。" }, failed: "记录加载失败。", retry: "重试", more: "加载更多", detail: "查看改动", hideDetail: "收起改动",
    expand: (count: number) => `展开${count}条时间相近的信息`, collapse: "收起" },
  en: { title: "Activity", member: "Member", everyone: "Everyone", period: "Time", periods: { all: "Any time", week: "Last 7 days", month: "Last 30 days" }, system: "System notices", local: "Edits recorded on this device only; not a verified multi-user record.",
    empty: "No activity yet", location: { approximate: "The place moved; showing the same content.", deleted: "The original content was deleted.", unavailable: "The original place cannot be determined." }, failed: "Could not load activity.", retry: "Retry", more: "Load more", detail: "Show changes", hideDetail: "Hide changes",
    expand: (count: number) => `Show ${count} nearby ${count === 1 ? "entry" : "entries"}`, collapse: "Collapse" },
} as const;
