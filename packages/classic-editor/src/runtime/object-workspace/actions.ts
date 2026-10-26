import type {
  ClassicEditorActionReason,
  ClassicEditorActionState,
  ClassicEditorRenderContext
} from "../../types";
import type {
  ClassicEditorObjectActionContribution,
  ClassicEditorObjectActionProjection,
  ClassicEditorObjectActionSurfaceProjection,
  ClassicEditorObjectFreshness,
  ClassicEditorObjectWorkspaceContribution,
  ClassicEditorObjectWorkspaceLayout
} from "../../types/object-workspace";
import { resolveClassicEditorActionState } from "../ui";

/**
 * Projects one retained action catalog into a responsive object recipe.
 *
 * @param contribution - Exact object contribution.
 * @param freshness - Latest exact-target freshness.
 * @param context - Mounted product action context.
 * @param layout - Root-local responsive layout.
 * @returns Direct action objects partitioned for visible and overflow controls.
 */
export function projectObjectWorkspaceActions(
  contribution: ClassicEditorObjectWorkspaceContribution,
  freshness: ClassicEditorObjectFreshness,
  context: ClassicEditorRenderContext,
  layout: ClassicEditorObjectWorkspaceLayout
): ClassicEditorObjectActionSurfaceProjection {
  const maxPrimary = layout === "wide" ? 7 : 3;
  const ordered = [...contribution.actions].sort((left, right) => (
    left.rank - right.rank || left.action.order - right.action.order
  ));
  const projected = ordered
    .map((entry) => projectAction(entry, contribution, freshness, context))
    .filter((entry): entry is {
      readonly contribution: ClassicEditorObjectActionContribution;
      readonly projection: ClassicEditorObjectActionProjection;
    } => entry !== null);
  const visible = projected.filter(
    entry => entry.contribution.prominence !== "overflow"
  );
  const controls = projected.filter(entry => entry.projection.control !== null);
  const plainSlots = Math.max(0, maxPrimary - controls.length);
  const retained = new Set([
    ...controls,
    ...visible.filter(entry => entry.projection.control === null).slice(0, plainSlots)
  ]);
  const primary = projected.filter(entry => retained.has(entry));
  const primarySet = new Set(primary.map((entry) => entry.contribution));
  return Object.freeze({
    primary: Object.freeze(primary.map((entry) => entry.projection)),
    overflow: Object.freeze(projected
      .filter((entry) => !primarySet.has(entry.contribution))
      .map((entry) => entry.projection))
  });
}

/**
 * Resolves one action without turning its diagnostic id into an execution key.
 *
 * @param entry - Direct action plus object presentation metadata.
 * @param contribution - Exact object contribution.
 * @param freshness - Exact target freshness.
 * @param context - Mounted product context.
 * @returns Visible projection or null for an unavailable action.
 */
function projectAction(
  entry: ClassicEditorObjectActionContribution,
  contribution: ClassicEditorObjectWorkspaceContribution,
  freshness: ClassicEditorObjectFreshness,
  context: ClassicEditorRenderContext
): {
  readonly contribution: ClassicEditorObjectActionContribution;
  readonly projection: ClassicEditorObjectActionProjection;
} | null {
  const payload = Object.freeze({ target: contribution.target });
  const resolved = resolveClassicEditorActionState(
    entry.action,
    context,
    payload,
    "contextual-popup"
  );
  if (!resolved.available || freshness.status === "unavailable") return null;
  const supplement = entry.presentation?.() ?? {};
  const targetReady = freshness.status === "ready";
  const state: ClassicEditorActionState = targetReady
    ? resolved
    : Object.freeze({
      ...resolved,
      canExecute: false,
      reason: targetReason(freshness)
    });
  const busy = supplement.busy === true;
  const reason = supplement.reason ?? state.reason;
  return {
    contribution: entry,
    projection: Object.freeze({
      action: entry.action,
      state: busy ? Object.freeze({ ...state, canExecute: false, reason }) : state,
      busy,
      mixed: supplement.mixed === true,
      reason,
      control: entry.control ?? null
    })
  };
}

/** @param freshness - Exact target freshness. @returns Stable direct-action reason. */
export function targetReason(
  freshness: ClassicEditorObjectFreshness
): ClassicEditorActionReason {
  return Object.freeze({
    code: `object-target-${freshness.status}`,
    message: freshness.reason ?? {
      en: "This object is no longer editable.",
      "zh-CN": "当前对象已不可编辑。"
    }
  });
}
