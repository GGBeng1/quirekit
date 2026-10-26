import type { ClassicEditorLocale } from "@classic/types";
import type { ClassicEditorWorkspacePanelFreshnessStatus } from "@classic/types/workspace-panel";

/** Localized shared Workspace Panel chrome. */
export interface ClassicEditorWorkspacePanelMessages {
  /** Back button label. */
  readonly back: string;
  /** Close button label. */
  readonly close: string;
  /** Pin button label while unpinned. */
  readonly pin: string;
  /** Pin button label while pinned. */
  readonly unpin: string;
  /** Shared host accessible name. */
  readonly workspace: string;
  /** Target status labels keyed by the closed freshness language. */
  readonly freshness: Readonly<Record<ClassicEditorWorkspacePanelFreshnessStatus, string>>;
}

const messages: Readonly<Record<ClassicEditorLocale, ClassicEditorWorkspacePanelMessages>> = {
  "zh-CN": {
    back: "返回上一级",
    close: "关闭工作区",
    pin: "固定工作区",
    unpin: "取消固定工作区",
    workspace: "工作区面板",
    freshness: {
      ready: "目标可用",
      stale: "目标已变化",
      unavailable: "目标不可用",
      locked: "目标已锁定"
    }
  },
  en: {
    back: "Back",
    close: "Close workspace",
    pin: "Pin workspace",
    unpin: "Unpin workspace",
    workspace: "Workspace panel",
    freshness: {
      ready: "Target available",
      stale: "Target changed",
      unavailable: "Target unavailable",
      locked: "Target locked"
    }
  }
};

/**
 * Resolves complete shared chrome copy for one product locale.
 *
 * @param locale - Current Classic Editor locale.
 * @returns Complete localized messages.
 */
export function resolveWorkspacePanelMessages(
  locale: ClassicEditorLocale
): ClassicEditorWorkspacePanelMessages {
  return messages[locale];
}
