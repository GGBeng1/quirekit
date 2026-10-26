import type { QuireKitPopoverPlacement } from '../../components/popover';

/** 补充阅读浮层的状态、时序与定位合同。 */
export interface QuireKitHoverCardProps {
  /** 受控打开状态；省略时由组件管理。 */
  readonly open?: boolean | undefined;
  /** 非受控初始状态。 */
  readonly defaultOpen?: boolean;
  /** 悬停打开延迟，单位毫秒；键盘聚焦即时显示。 */
  readonly openDelay?: number;
  /** 离开触发器与内容后的关闭延迟，单位毫秒。 */
  readonly closeDelay?: number;
  /** 停用补充预览，保留触发元素自身的功能。 */
  readonly disabled?: boolean;
  /** 首选方位；空间不足时自动避让。 */
  readonly placement?: QuireKitPopoverPlacement;
  /** 内容与触发器的距离，单位 CSS 像素。 */
  readonly gutter?: number;
}
