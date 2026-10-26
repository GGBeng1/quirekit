import type { ClassicEditorLocale } from "../../../types";

/** Shared object-surface messages. */
export interface ClassicEditorObjectWorkspaceMessages {
  /** Accessible toolbar name. */
  readonly actions: string;
  /** More-action trigger label. */
  readonly more: string;
  /** Inspector trigger and heading label. */
  readonly properties: string;
  /** Sheet back action label. */
  readonly back: string;
  /** Sheet close action label. */
  readonly close: string;
  /** Mixed-value placeholder label. */
  readonly mixed: string;
  /** Field reset action label. */
  readonly reset: string;
  /** Busy action status label. */
  readonly busy: string;
}

/**
 * Resolves the compact built-in object workspace vocabulary.
 *
 * @param locale - Current product locale.
 * @returns Root-localized shared messages.
 */
export function resolveObjectWorkspaceMessages(
  locale: ClassicEditorLocale
): ClassicEditorObjectWorkspaceMessages {
  return locale === "zh-CN"
    ? {
      actions: "对象操作",
      more: "更多",
      properties: "属性",
      back: "返回对象",
      close: "关闭属性",
      mixed: "混合值",
      reset: "重置",
      busy: "处理中"
    }
    : {
      actions: "Object actions",
      more: "More",
      properties: "Properties",
      back: "Back to object",
      close: "Close properties",
      mixed: "Mixed value",
      reset: "Reset",
      busy: "Working"
    };
}
