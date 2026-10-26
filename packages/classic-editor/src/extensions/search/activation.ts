import type { QuireEditor } from "@quirekit/core";
import { getSearchSnapshot, getSearchPluginState } from "@quirekit/extension-search";
import type {
  QuireMountedServiceContext,
  QuireMountedViewServiceContribution
} from "@quirekit/view/mounted-services";

/** Mounted text activation captured for each editor. */
const activators = new WeakMap<QuireEditor, QuireMountedServiceContext["activateText"]>();

/**
 * Creates the mounted service that lends the view's text activation to search.
 *
 * @returns Service contribution registered by the Classic search extension.
 */
export function createClassicSearchActivationService(): QuireMountedViewServiceContribution {
  return {
    id: "classic-search-activation",
    create(context) {
      const activate = context.activateText;
      activators.set(context.editor, activate);
      return {
        destroy(): void {
          if (activators.get(context.editor) === activate) activators.delete(context.editor);
        }
      };
    }
  };
}

/** Editors whose last revealed match was in the main flow, with no story ownership left behind. */
const revealedInMainFlow = new WeakSet<QuireEditor>();

/**
 * Forgets where the last match was revealed, so the next one is activated in full.
 *
 * Called when focus returns to the search card: the user may have entered a story
 * by hand since the last navigation.
 *
 * @param editor - Searched editor.
 */
export function resetClassicSearchReveal(editor: QuireEditor): void {
  revealedInMainFlow.delete(editor);
}

/**
 * Hands the active match to the view so story matches enter their editing session.
 *
 * The search command already selected and scrolled to the match, so main-flow
 * matches skip the extra activation while the previous match was also in the
 * main flow; otherwise activation exits the story the previous match entered.
 * Focus stays in the search card.
 *
 * @param editor - Searched editor.
 * @returns Whether the match is revealed.
 */
export function revealClassicSearchActiveMatch(editor: QuireEditor): boolean {
  const activate = activators.get(editor);
  const { active } = getSearchPluginState(editor.state.pm);
  if (activate === undefined || active === null || getSearchSnapshot(editor.state.pm).activeIndex < 0) return false;
  const mainFlow = active.segmentKind === "body" || active.segmentKind === "document";
  if (mainFlow && revealedInMainFlow.has(editor)) return true;
  const revealed = activate({ doc: editor.state.pm.doc, anchor: active.from, head: active.to }, { focus: false });
  if (revealed && mainFlow) revealedInMainFlow.add(editor);
  else revealedInMainFlow.delete(editor);
  return revealed;
}
