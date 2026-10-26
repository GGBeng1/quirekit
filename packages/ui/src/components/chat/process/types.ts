import type { QuireKitChatToolState } from '../message-part/types';
import type { QuireKitChatMessageState } from '../shared/types';

/** 多个过程单元的整体展示状态，由宿主投影。 */
export type QuireKitChatProcessState = QuireKitChatMessageState | QuireKitChatToolState;

/** 过程汇总和折叠外壳，不建立回合或执行引擎。 */
export interface QuireKitChatProcessProps {
  /** 稳定过程身份；改变时清理未受控展开状态。 */
  readonly processId: string;
  /** 汇总标题，例如“已检查 3 项资料”。 */
  readonly title: string;
  /** 可选公共 Icon 名称，不推断子项类型。 */
  readonly icon?: string;
  /** 可选摘要。 */
  readonly summary?: string;
  /** 宿主格式化的耗时。 */
  readonly meta?: string;
  /** 权威展示状态，默认 complete。 */
  readonly state?: QuireKitChatProcessState;
  /** 必要时覆盖状态描述，例如等待审批原因。 */
  readonly stateLabel?: string;
  /** 可选受控展开。 */
  readonly open?: boolean | undefined;
  /** 初始展开，默认 false；完成不会覆盖用户选择。 */
  readonly defaultOpen?: boolean;
}
