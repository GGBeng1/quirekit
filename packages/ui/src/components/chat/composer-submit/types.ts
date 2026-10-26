import type { QuireKitButtonColor, QuireKitButtonSize } from '../../button';

/** 可独立组合的发送 / 停止控件。 */
export interface QuireKitChatComposerSubmitProps {
  /** 宿主已允许发送；不自行判定文本或附件。 */
  readonly canSubmit?: boolean;
  /** 显示停止动作；不阻止该动作获得焦点。 */
  readonly busy?: boolean;
  /** 同时禁用发送和停止。 */
  readonly disabled?: boolean;
  /** 默认圆形图标；text 显示文字按钮。 */
  readonly appearance?: 'icon' | 'text';
  /** 公共 Button 语义色，默认 primary 主题主色。 */
  readonly color?: QuireKitButtonColor;
  /** 公共 Button 尺寸。 */
  readonly size?: QuireKitButtonSize;
}
