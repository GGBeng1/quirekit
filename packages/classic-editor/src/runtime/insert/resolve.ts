import { resolveClassicEditorActionState } from "../ui/action-catalog";
import type {
  ClassicEditorActionReason,
  ClassicEditorRenderContext
} from "../../types";
import type {
  ClassicEditorInsertCapability,
  ClassicEditorInsertCapabilityMode,
  ClassicEditorInsertItemDefinition,
  ClassicEditorInsertQuery,
  ResolvedClassicEditorInsertItem
} from "../../types/insert";
import { localizeClassicEditorInsertText } from "./localize";

const defaultCapability: ClassicEditorInsertCapability = Object.freeze({
  mode: "available"
});
const defaultReasons: Readonly<Record<
  Exclude<ClassicEditorInsertCapabilityMode, "available" | "hidden">,
  ClassicEditorActionReason
>> = Object.freeze({
  constrained: {
    code: "insert-constrained",
    message: { "zh-CN": "当前仅支持受约束的创建范围", en: "Available with current constraints" }
  },
  "preserved-readonly": {
    code: "insert-preserved-readonly",
    message: { "zh-CN": "内容可保留，但当前不可创建", en: "Preserved, but not currently authorable" }
  },
  "host-missing": {
    code: "insert-host-missing",
    message: { "zh-CN": "需要宿主提供此能力", en: "Requires a host capability" }
  },
  unsupported: {
    code: "insert-unsupported",
    message: { "zh-CN": "当前版本尚不支持", en: "Not supported in this version" }
  }
});

/**
 * Resolves one visible item from feature capability and canonical action state.
 *
 * @param definition - Feature-owned Insert item.
 * @param context - Latest mounted product context.
 * @param locale - Product locale for visible copy.
 * @returns Resolved visible item, or null when explicitly hidden/not installed.
 */
export function resolveClassicEditorInsertDefinition(
  definition: ClassicEditorInsertItemDefinition,
  context: ClassicEditorRenderContext,
  locale: ClassicEditorInsertQuery["locale"]
): ResolvedClassicEditorInsertItem | null {
  const capability = resolveClassicEditorInsertCapability(definition, context);
  if (capability.mode === "hidden") return null;
  const actionState = resolveClassicEditorActionState(
    definition.action,
    context,
    undefined,
    "menu",
    Object.freeze({ surface: "insert-catalog", itemId: definition.id })
  );
  const explicitlyVisible = capability.mode !== "available";
  if (!actionState.available && !explicitlyVisible) return null;
  const canExecute = actionState.available
    && actionState.canExecute
    && isClassicEditorInsertCapabilityExecutable(capability.mode);
  const reason = resolveReason(capability, actionState.reason, canExecute);
  return Object.freeze({
    definition,
    label: localizeClassicEditorInsertText(definition.action.label, locale),
    description: definition.description === undefined
      ? null
      : localizeClassicEditorInsertText(definition.description, locale),
    preview: definition.preview === undefined
      ? null
      : localizeClassicEditorInsertText(definition.preview, locale),
    capability: capability.mode,
    canExecute,
    active: actionState.active,
    reason: reason === null ? null : localizeClassicEditorInsertText(reason.message, locale)
  });
}

/**
 * Resolves feature-owned capability facts defensively.
 *
 * @param definition - Feature-owned Insert item.
 * @param context - Latest mounted product context.
 * @returns Explicit capability facts.
 */
export function resolveClassicEditorInsertCapability(
  definition: ClassicEditorInsertItemDefinition,
  context: ClassicEditorRenderContext
): ClassicEditorInsertCapability {
  return definition.capability?.(context) ?? defaultCapability;
}

/**
 * Reports whether a capability disposition permits invoking the canonical action.
 *
 * @param mode - Resolved capability disposition.
 * @returns Whether the retained action may be revalidated and invoked.
 */
export function isClassicEditorInsertCapabilityExecutable(
  mode: ClassicEditorInsertCapabilityMode
): boolean {
  return mode === "available" || mode === "constrained";
}

/**
 * Chooses the explanation shown by a disabled or constrained item.
 *
 * @param capability - Product capability disposition.
 * @param actionReason - Canonical action applicability reason.
 * @param canExecute - Final combined executability.
 * @returns Stable reason or null for an ordinary enabled item.
 */
function resolveReason(
  capability: ClassicEditorInsertCapability,
  actionReason: ClassicEditorActionReason | null,
  canExecute: boolean
): ClassicEditorActionReason | null {
  if (capability.reason !== undefined) return capability.reason;
  if (capability.mode !== "available" && capability.mode !== "hidden") {
    return defaultReasons[capability.mode];
  }
  return canExecute ? null : actionReason;
}
