/** Field 当前在唯一反馈通道中表达的状态。 */
export type QuireKitFieldStatus =
  | "description"
  | "mixed"
  | "busy"
  | "disabled"
  | "error";

/** Field 默认槽传递给输入控件的可访问属性。 */
export interface QuireKitFieldControlProps {
  /** 控件默认占满字段宽度；可在绑定后显式覆盖。 */
  readonly width?: string;
  /** 标签指向的控件 id。 */
  readonly id: string;
  /** 当前反馈通道的关联 id。 */
  readonly "aria-describedby"?: string | undefined;
  /** 错误反馈通道的关联 id。 */
  readonly "aria-errormessage"?: string | undefined;
  /** 控件当前是否处于错误状态。 */
  readonly "aria-invalid"?: "true" | undefined;
  /** 字段控件的部件标识。 */
  readonly "data-part": string;
  /** 字段控件的作用域标识。 */
  readonly "data-scope": string;
  /** 控件当前是否处于错误状态。 */
  readonly invalid: boolean;
  /** 控件是否为必填项。 */
  readonly required: boolean;
  /** 控件是否被禁用。 */
  readonly disabled: boolean;
  /** 控件是否只读。 */
  readonly readOnly: boolean;
}

/** Field 默认槽获得的组合状态。 */
export interface QuireKitFieldSlotProps {
  /** 应绑定到唯一输入控件的属性。 */
  readonly controlProps: QuireKitFieldControlProps;
  /** 当前反馈通道的语义状态。 */
  readonly status: QuireKitFieldStatus | undefined;
}
