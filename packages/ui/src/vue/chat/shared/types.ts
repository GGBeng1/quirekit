import type { QuireKitChatProcessProps } from '../../../components/chat';

/** Shared process disclosure mechanics; public semantic owners supply content. */
export interface ChatDisclosureProps extends QuireKitChatProcessProps {
  /** Steps retain the parent's leading edge; leaf details align with their summary content. */
  readonly contentLayout?: 'detail' | 'steps';
  /** Optional process icon, replaced by activity/error indicators when needed. */
  readonly icon?: string;
}
