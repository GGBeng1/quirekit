/** 预览容器的可选页签。 */
export type QuireKitProsePreviewMode = "preview" | "source";

/** 实时预览与按需源码的公共容器。 */
export interface QuireKitProsePreviewProps {
  /** 未受控时的初始页签，默认 preview。 */
  readonly defaultValue?: QuireKitProsePreviewMode;
  /** 页签组的可访问名称；省略时取自语言包。 */
  readonly label?: string;
  /** 允许非传送浮层超出预览容器；默认 hidden。 */
  readonly overflow?: "hidden" | "visible";
}

/** 预览与源码分别由消费者提供；组件不加载模块或执行代码。 */
export interface QuireKitProsePreviewSlots {
  /** 持续挂载的实时内容，切换页签保留交互状态。 */
  default?: () => unknown;
  /** 首次访问源码页签才挂载，之后保留；可在此加载或渲染源码。 */
  source?: () => unknown;
}
