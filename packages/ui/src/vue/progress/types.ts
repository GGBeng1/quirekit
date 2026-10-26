import type {
  QuireKitProgressShape,
  QuireKitProgressSize,
  QuireKitProgressSlotProps,
  QuireKitProgressTone,
  QuireKitProgressValueChangeDetails
} from "../../components/progress";

/** Vue Progress 适配器的公开属性。 */
export interface QuireProgressProps {
  /** 任务的可访问名称；隐藏可见标签时仍须提供。 */
  readonly label: string;
  /** 只读取首次值；省略时 spinner 为 null，其他形态为 0。 */
  readonly defaultValue?: number | null;
  /** 最小值；无效范围整体回退为 0..100。 */
  readonly min?: number;
  /** 最大值；必须大于最小值且范围跨度有限。 */
  readonly max?: number;
  /** Intl 数值格式；percent 使用范围比例，其他样式使用实际值。 */
  readonly formatOptions?: Intl.NumberFormatOptions;
  /** 线性、环形或轻量行内圆环。 */
  readonly shape?: QuireKitProgressShape;
  /** 控件视觉尺寸；spinner 对应 16/20/24px。 */
  readonly size?: QuireKitProgressSize;
  /** 进度的语义色。 */
  readonly tone?: QuireKitProgressTone;
  /** 是否显示标签；spinner 默认关闭，其他形态默认开启。 */
  readonly showLabel?: boolean | undefined;
  /** 是否显示格式化数值；spinner 默认关闭，其他形态默认开启。 */
  readonly showValue?: boolean | undefined;
}

/** Progress 的可替换内容位置。 */
export interface QuireProgressSlots {
  /** 替换任务标签；隐藏标签时仍作为可访问名称。 */
  readonly label?: (props: QuireKitProgressSlotProps) => unknown;
  /** 替换可见数值；上下文与默认 ARIA 值文本保持一致。 */
  readonly value?: (props: QuireKitProgressSlotProps) => unknown;
}

/** Progress 发出的公开语义事件。 */
export interface QuireProgressEmits {
  /** 状态机主动改变数值时触发；属性更新或展示钳制不会触发。 */
  valueChange: [details: QuireKitProgressValueChangeDetails];
}
