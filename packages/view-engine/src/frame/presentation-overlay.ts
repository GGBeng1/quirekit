import type { QuireEditorState } from "@quirekit/core";
import {
  Decoration,
  Mapping,
  StepMap,
  Transform,
  type DecorationAttrs
} from "@quirekit/pm";
import type { QuireImePreedit } from "../layout";
import type {
  QuirePresentationOverlay,
  QuirePresentationOverlayRole,
  QuirePresentationOverlayRoleStyle,
  QuireViewEngineFrameBuildOptions
} from "./types";

/** Engine default paint per overlay role. */
const defaultRoleStyles: Record<QuirePresentationOverlayRole, QuirePresentationOverlayRoleStyle> = {
  inserted: { background: "rgba(34, 197, 94, 0.16)", line: "underline", lineColor: "#16a34a" },
  removed: { textColor: "rgba(185, 28, 28, 0.55)", line: "strikethrough", lineColor: "#dc2626" },
  changed: { background: "rgba(59, 130, 246, 0.14)" }
};

/**
 * Admits the overlay against the committed document and moves IME preedit into
 * presentation coordinates, so every frame phase reads one consistent option set.
 *
 * @param state - Committed editor state.
 * @param options - Caller frame options.
 * @returns Options whose overlay is applicable and whose preedit follows it.
 */
export function resolveQuirePresentationFrameOptions(
  state: QuireEditorState,
  options: QuireViewEngineFrameBuildOptions
): QuireViewEngineFrameBuildOptions {
  const overlay = options.presentationOverlay;
  if (overlay === undefined) return options;
  // Steps are planned against the committed document; a concurrent node patch
  // (drawing drag) would shift their positions, so that frame shows the patch only.
  if (
    options.transientNodeLayoutPatch !== undefined
    || !canApplyQuirePresentationOverlay(state, overlay)
  ) {
    const { presentationOverlay: _stale, ...rest } = options;
    return rest;
  }
  const preedit = options.imePreedit;
  if (preedit === undefined) return options;
  const mapping = new Mapping(overlay.steps.map((step) => step.getMap()));
  return {
    ...options,
    imePreedit: {
      ...preedit,
      range: {
        from: mapping.map(preedit.range.from, 1),
        to: mapping.map(preedit.range.to, -1)
      }
    }
  };
}

/**
 * Reports whether every overlay step applies to the committed document.
 *
 * @param state - Committed editor state.
 * @param overlay - Candidate overlay.
 * @returns Whether frames may render the overlay.
 */
function canApplyQuirePresentationOverlay(
  state: QuireEditorState,
  overlay: QuirePresentationOverlay
): boolean {
  if (overlay.baseDoc !== state.doc) return false;
  const transform = new Transform(state.doc);
  return overlay.steps.every((step) => !transform.maybeStep(step).failed);
}

/**
 * Applies admitted overlay steps without dispatching or touching history; an
 * overlay that no longer applies leaves the state unchanged.
 *
 * @param state - State after earlier speculative inputs.
 * @param overlay - Admitted overlay, or undefined.
 * @returns PM state containing the presentation document.
 */
export function applyQuirePresentationOverlay(
  state: QuireEditorState["pm"],
  overlay: QuirePresentationOverlay | undefined
): QuireEditorState["pm"] {
  if (overlay === undefined || overlay.steps.length === 0) return state;
  const transaction = state.tr;
  for (const step of overlay.steps) {
    if (transaction.maybeStep(step).failed) return state;
  }
  return state.apply(transaction);
}

/**
 * Converts overlay role ranges into engine-owned inline decorations in the
 * final frame document, after any IME preedit insertion.
 *
 * @param options - Frame options already resolved by {@link resolveQuirePresentationFrameOptions}.
 * @param docSize - Content size of the frame document.
 * @returns Inline decorations painted by the regular decoration lane.
 */
export function createQuirePresentationOverlayDecorations(
  options: QuireViewEngineFrameBuildOptions,
  docSize: number
): readonly Decoration[] {
  const overlay = options.presentationOverlay;
  if (overlay === undefined) return [];
  const preedit = resolvePreeditMap(options.imePreedit);
  const decorations: Decoration[] = [];
  for (const range of overlay.ranges) {
    const from = Math.max(0, preedit?.map(range.from, 1) ?? range.from);
    const to = Math.min(docSize, preedit?.map(range.to, -1) ?? range.to);
    if (to <= from) continue;
    const style = { ...defaultRoleStyles[range.role], ...overlay.styles?.[range.role] };
    decorations.push(Decoration.inline(from, to, createRoleAttrs(range.role, style)));
  }
  return decorations;
}

/**
 * Builds the position map of a visible IME preedit insertion.
 *
 * @param preedit - Preedit in presentation coordinates.
 * @returns Step map, or undefined without visible preedit.
 */
function resolvePreeditMap(preedit: QuireImePreedit | undefined): StepMap | undefined {
  if (preedit === undefined || preedit.text.length === 0) return undefined;
  const { from, to } = preedit.range;
  return new StepMap([from, to - from, preedit.text.length]);
}

/**
 * Encodes one role style as decoration attributes understood by the lane.
 *
 * @param role - Overlay role.
 * @param style - Resolved role style.
 * @returns Decoration attributes.
 */
function createRoleAttrs(
  role: QuirePresentationOverlayRole,
  style: QuirePresentationOverlayRoleStyle
): DecorationAttrs {
  return {
    "data-qk-presentation-role": role,
    ...(style.background === undefined ? {} : { "data-qk-decoration-background": style.background }),
    ...(style.textColor === undefined ? {} : { "data-qk-decoration-text-color": style.textColor }),
    ...(style.line === undefined ? {} : {
      "data-qk-text-decoration-line": style.line,
      ...(style.lineColor === undefined ? {} : { "data-qk-text-decoration-color": style.lineColor })
    })
  };
}
