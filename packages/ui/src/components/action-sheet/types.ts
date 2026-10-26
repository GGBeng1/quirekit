/** 底部操作面板中的动作。 */
export interface QuireKitActionSheetAction {
  /** 动作执行时返回的唯一值。 */
  readonly value: string;
  /** 动作的可见名称与可访问名称。 */
  readonly label: string;
  /** 动作说明，可用于解释禁用原因。 */
  readonly description?: string;
  /** 由 QuireIconProvider 提供的图标名。 */
  readonly icon?: string;
  /** 是否禁用动作。 */
  readonly disabled?: boolean;
  /** 是否以危险色突出动作。 */
  readonly danger?: boolean;
  /** 相邻同组动作的分组标题。 */
  readonly group?: string;
}

/** 保留原始动作顺序的相邻分组。 */
export interface QuireKitActionSheetGroup {
  /** 可见分组标题；undefined 表示无标题。 */
  readonly label: string | undefined;
  /** 按原始顺序排列的动作。 */
  readonly actions: readonly QuireKitActionSheetAction[];
}

/** 自定义动作图标时提供的内容。 */
export interface QuireKitActionSheetIconSlotProps {
  /** 当前动作。 */
  readonly action: QuireKitActionSheetAction;
}
