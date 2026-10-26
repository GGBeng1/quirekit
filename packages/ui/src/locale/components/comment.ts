/** CommentThread、CommentDraft 的界面文案。 */
export interface Messages {
  /** 标记解决。 */
  readonly resolve: string;
  /** 重新打开。 */
  readonly reopen: string;
  /** 已解决标签。 */
  readonly resolved: string;
  /** 更多操作菜单。 */
  readonly moreActions: string;
  /** 编辑消息。 */
  readonly edit: string;
  /** 删除消息或评论。 */
  readonly delete: string;
  /** 回复输入框的可访问名称。 */
  readonly reply: string;
  /** 回复输入框占位。 */
  readonly replyPlaceholder: string;
  /** 新评论输入框占位。 */
  readonly draftPlaceholder: string;
  /** 取消。 */
  readonly cancel: string;
  /** 发送回复。 */
  readonly send: string;
  /** 提交新评论。 */
  readonly submit: string;
  /** 保存编辑。 */
  readonly save: string;
  /** 提交快捷键提示。 */
  readonly submitHint: string;
  /** 已编辑标记。 */
  readonly edited: string;
  /** 折叠时的回复数量。 */
  readonly replies: (count: number) => string;
  /** 没有引用文字的位置评论。 */
  readonly point: string;
  /** 原文已被删除。 */
  readonly quoteDeleted: string;
  /** 原文已找不到。 */
  readonly quoteUnavailable: string;
  /** 跳转原文按钮的可访问名称。 */
  readonly goToQuote: (quote: string) => string;
  /** 上一条评论。 */
  readonly previous: string;
  /** 下一条评论。 */
  readonly next: string;
  /** 当前评论在全部评论中的位置，例如“2 / 5”的可访问名称。 */
  readonly position: (index: number, total: number) => string;
  /** 提及候选列表的可访问名称。 */
  readonly mentionList: string;
  /** 没有匹配的成员。 */
  readonly mentionEmpty: string;
  /** 正在查找成员。 */
  readonly mentionLoading: string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  resolve: "解决",
  reopen: "重新打开",
  resolved: "已解决",
  moreActions: "更多操作",
  edit: "编辑",
  delete: "删除",
  reply: "回复",
  replyPlaceholder: "回复…",
  draftPlaceholder: "添加评论…",
  cancel: "取消",
  send: "回复",
  submit: "评论",
  save: "保存",
  submitHint: "⌘/Ctrl + Enter 发送",
  edited: "已编辑",
  replies: count => `${count} 条回复`,
  point: "位置评论",
  quoteDeleted: "原文已删除",
  quoteUnavailable: "原文已找不到",
  goToQuote: quote => `定位原文：${quote}`,
  previous: "上一条",
  next: "下一条",
  position: (index, total) => `第 ${index} 条，共 ${total} 条`,
  mentionList: "提及成员",
  mentionEmpty: "没有匹配的成员",
  mentionLoading: "正在查找…"
};

/** English. */
export const en: Messages = {
  resolve: "Resolve",
  reopen: "Reopen",
  resolved: "Resolved",
  moreActions: "More actions",
  edit: "Edit",
  delete: "Delete",
  reply: "Reply",
  replyPlaceholder: "Reply…",
  draftPlaceholder: "Add a comment…",
  cancel: "Cancel",
  send: "Reply",
  submit: "Comment",
  save: "Save",
  submitHint: "⌘/Ctrl + Enter to send",
  edited: "Edited",
  replies: count => `${count} ${count === 1 ? "reply" : "replies"}`,
  point: "Comment on a position",
  quoteDeleted: "Original text was deleted",
  quoteUnavailable: "Original text can't be found",
  goToQuote: quote => `Go to text: ${quote}`,
  previous: "Previous comment",
  next: "Next comment",
  position: (index, total) => `Comment ${index} of ${total}`,
  mentionList: "Mention someone",
  mentionEmpty: "No matching people",
  mentionLoading: "Searching…"
};
