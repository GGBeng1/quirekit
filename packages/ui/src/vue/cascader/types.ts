import type { QuireKitHierarchyPickerProps } from '../hierarchy-picker/types';

/** Single root-to-leaf path picker. */
export interface QuireKitCascaderProps extends QuireKitHierarchyPickerProps {
  /** 默认 hover 悬停展开独立子浮层；click 仅点击展开。两者均支持键盘。 */
  readonly expandTrigger?: 'hover' | 'click';
  /** Controlled root-to-leaf ids; browsing ancestors does not commit this path. */
  readonly modelValue?: string[] | undefined;
  /** Initial selected path, also restored by native form reset. */
  readonly defaultValue?: string[] | undefined;
}
