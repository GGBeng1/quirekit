/** TagsInput interface text. */
export interface Messages {
  /** Input hint while more tags can be added and no placeholder is given. */
  readonly placeholder: string;
  /** Input hint once the tag limit is reached. */
  readonly atMax: string;
  /** Default feedback when the host marks the field invalid without errorText. */
  readonly invalid: string;
  /** Feedback after an addition is rejected for exceeding the limit. */
  readonly overflow: (max: number) => string;
  /** Feedback after a tag fails validation or duplicates an existing one. */
  readonly rejected: string;
  /** Accessible name of the clear-all action. */
  readonly clearAll: string;
  /** Accessible name of a tag's remove action. */
  readonly remove: (value: string) => string;
  /** Announcement when a tag is selected. */
  readonly selected: (value: string) => string;
  /** Announcement when a tag is added. */
  readonly added: (value: string) => string;
  /** Announcement when several tags are pasted at once. */
  readonly pasted: (count: number) => string;
  /** Announcement when a tag enters edit mode. */
  readonly editing: (value: string) => string;
  /** Announcement when an edited tag is committed. */
  readonly updated: (value: string) => string;
  /** Announcement when a tag is removed. */
  readonly removed: (value: string) => string;
  /** Announcement when no tag is selected. */
  readonly noneSelected: string;
  /** Accessible name of the text input; label names the field. */
  readonly inputLabel: (label: string, count: number) => string;
}

/** @param count - Item count. @returns Count with an English plural of "tag". */
function tags(count: number): string {
  return `${count} ${count === 1 ? "tag" : "tags"}`;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  placeholder: "输入后按 Enter 添加",
  atMax: "已达到标签上限",
  invalid: "请检查标签内容",
  overflow: max => `最多只能添加 ${max} 个标签`,
  rejected: "此标签无效或已经存在",
  clearAll: "清空全部标签",
  remove: value => `移除 ${value}`,
  selected: value => `已选择 ${value}`,
  added: value => `已添加 ${value}`,
  pasted: count => `已粘贴 ${count} 个标签`,
  editing: value => `正在编辑 ${value}`,
  updated: value => `已更新 ${value}`,
  removed: value => `已移除 ${value}`,
  noneSelected: "没有选中标签",
  inputLabel: (label, count) => `${label}，当前 ${count} 个标签`
};

/** English. */
export const en: Messages = {
  placeholder: "Type and press Enter to add",
  atMax: "Tag limit reached",
  invalid: "Check the tags",
  overflow: max => `You can add up to ${tags(max)}`,
  rejected: "This tag is invalid or already exists",
  clearAll: "Clear all tags",
  remove: value => `Remove ${value}`,
  selected: value => `${value} selected`,
  added: value => `${value} added`,
  pasted: count => `${tags(count)} pasted`,
  editing: value => `Editing ${value}`,
  updated: value => `${value} updated`,
  removed: value => `${value} removed`,
  noneSelected: "No tag selected",
  inputLabel: (label, count) => `${label}, ${tags(count)}`
};
