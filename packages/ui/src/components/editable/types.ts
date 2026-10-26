/** 就地编辑的激活方式。 */
export type QuireKitEditableActivationMode = "focus" | "click" | "dblclick" | "none";

/** 就地编辑的提交方式；显式提交按钮始终可用。 */
export type QuireKitEditableSubmitMode = "enter" | "blur" | "both" | "none";

/** 就地编辑的值事件。 */
export interface QuireKitEditableValueDetails {
  /** 当前文本；取消事件携带恢复后的文本。 */
  readonly value: string;
}

/** 就地编辑的模式事件。 */
export interface QuireKitEditableEditDetails {
  /** 是否处于编辑模式。 */
  readonly edit: boolean;
}

/** 就地编辑插槽中的状态与操作。 */
export interface QuireKitEditableSlotProps {
  /** 当前文本。 */
  readonly value: string;
  /** 是否正在编辑。 */
  readonly editing: boolean;
  /** 进入编辑模式。 */
  readonly edit: () => void;
  /** 提交本次编辑。 */
  readonly submit: () => void;
  /** 撤销本次编辑。 */
  readonly cancel: () => void;
}
