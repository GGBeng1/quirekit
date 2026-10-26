/** Avatar 与 AvatarGroup 的界面文案。 */
export interface Messages {
  /** 在线状态。 */
  readonly online: string;
  /** 离开状态。 */
  readonly away: string;
  /** 忙碌状态。 */
  readonly busy: string;
  /** 离线状态。 */
  readonly offline: string;
  /** 带状态的头像可访问名称。 */
  readonly withStatus: (name: string, status: string) => string;
  /** 未提供 label 时成员组的可访问名称。 */
  readonly group: string;
  /** 超出显示上限的成员数量。 */
  readonly overflow: (count: number) => string;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  online: "在线",
  away: "离开",
  busy: "忙碌",
  offline: "离线",
  withStatus: (name, status) => `${name}，${status}`,
  group: "成员",
  overflow: count => `另有 ${count} 位成员`
};

/** English. */
export const en: Messages = {
  online: "Online",
  away: "Away",
  busy: "Busy",
  offline: "Offline",
  withStatus: (name, status) => `${name}, ${status}`,
  group: "Members",
  overflow: count => `${count} more ${count === 1 ? "member" : "members"}`
};
