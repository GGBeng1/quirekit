/** TagsInput 拒绝新增值的原因。 */
export type QuireKitTagsInputInvalidReason = "rangeOverflow" | "invalidTag";

/** TagsInput 标签集合变化后的详情。 */
export interface QuireKitTagsInputValueChangeDetails {
  /** 当前完整标签集合。 */
  readonly value: string[];
}

/** TagsInput 输入文本变化后的详情。 */
export interface QuireKitTagsInputTextChangeDetails {
  /** 当前尚未提交为标签的输入文本。 */
  readonly inputValue: string;
}

/** TagsInput 拒绝新增值后的详情。 */
export interface QuireKitTagsInputInvalidDetails {
  /** 达到数量上限或标签未通过校验。 */
  readonly reason: QuireKitTagsInputInvalidReason;
}

/** TagsInput 宿主校验器收到的候选值与已有集合。 */
export interface QuireKitTagsInputValidateDetails {
  /** 正准备新增或更新的标签文本。 */
  readonly inputValue: string;
  /** 提交前已有的完整标签集合。 */
  readonly value: string[];
}

/** TagsInput item 插槽获得的状态和操作。 */
export interface QuireKitTagsInputItemSlotProps {
  /** 当前标签文本。 */
  readonly value: string;
  /** 当前标签在集合中的索引。 */
  readonly index: number;
  /** 当前标签是否处于就地编辑状态。 */
  readonly editing: boolean;
  /** 当前标签是否由键盘或指针高亮。 */
  readonly highlighted: boolean;
  /** 从集合中移除当前标签。 */
  readonly remove: () => void;
}
