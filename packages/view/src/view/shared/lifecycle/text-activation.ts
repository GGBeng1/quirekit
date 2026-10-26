import type { QuireEditor } from "@quirekit/core";
import type { QuireInteractionSelectionTarget, QuireRetainedLayoutSnapshot } from "@quirekit/view-engine";
import { resolveMountedStoryTextTarget } from "../../../mounted-services/story-target";
import { isAcceptedMainTextTarget, isMainTextTarget } from "../../../mounted-services/text-target";
import type {
  QuireMountedTextActivationOptions,
  QuireMountedTextTarget
} from "../../../mounted-services/types";
import type { MountedDrawingTextEditingSession } from "../drawing-interaction/types";
import type { MountedHeaderFooterEditingController } from "../header-footer-editing";

/** Mounted interaction state and operations a text activation needs. */
export interface MountedTextActivationHost {
  /** Canonical editor receiving the selection. */
  readonly editor: QuireEditor;
  /** Input binding that owns keyboard focus, when editable input exists. */
  readonly inputBinding: { resetTransientState(options?: { restartNativeInput?: "if-needed" }): void; focus(): void } | undefined;
  /** Header/footer session owner. */
  readonly headerFooterEditing: MountedHeaderFooterEditingController;
  /** @returns Whether the view currently accepts edits. */
  readEditable(): boolean | undefined;
  /** @returns Current interaction geometry snapshot. */
  readSnapshot(): QuireRetainedLayoutSnapshot | undefined;
  /**
   * Resolves the text-box session owning a position.
   *
   * @param position - Position inside a text-box story.
   * @returns Session, or undefined when no laid-out text box owns the position.
   */
  resolveDrawingText(position: number): MountedDrawingTextEditingSession | undefined;
  /**
   * Activates a text-box session.
   *
   * @param session - Session to activate.
   * @param focus - Whether to focus the input proxy.
   */
  enterDrawingText(session: MountedDrawingTextEditingSession, focus: boolean): void;
  /** Cancels drawing creation and any nested drawing-text session. */
  cancelDrawing(): void;
  /**
   * Installs the retained target that now owns input; null for main text.
   *
   * @param target - Story target, or null after a main-text activation.
   */
  claim(target: QuireInteractionSelectionTarget | null): void;
  /** Schedules a selection render. */
  render(): void;
}

/**
 * Selects main or auxiliary-story text and hands it input ownership.
 *
 * Story text is hit-tested on the occurrence nearest the viewport, so the
 * retained target, header/footer session, and selection geometry match what a
 * pointer gesture on that occurrence would produce.
 *
 * @param host - Mounted interaction host.
 * @param target - Version-bound canonical text selection.
 * @param activation - Optional focus policy.
 * @returns Whether the target was accepted.
 */
export function activateMountedText(
  host: MountedTextActivationHost,
  target: QuireMountedTextTarget,
  activation?: QuireMountedTextActivationOptions
): boolean {
  const doc = host.editor.state.doc;
  const input = host.inputBinding;
  if (input === undefined || host.readEditable() === false || target.doc !== doc) return false;
  const main = isMainTextTarget(target, doc);
  const snapshot = main ? undefined : host.readSnapshot();
  const story = snapshot === undefined ? null : resolveMountedStoryTextTarget(snapshot, target.head);
  if (!main && story === null) return activateDrawingText(host, input, target, activation);
  if (story !== null && (target.anchor < story.instance.range.from || target.anchor > story.instance.range.to)) {
    return false;
  }
  input.resetTransientState({ restartNativeInput: "if-needed" });
  const region = story?.instance.region.kind;
  if (story !== null && (region === "header" || region === "footer")) {
    // A double click is the pointer gesture that enters a header/footer session.
    if (!host.headerFooterEditing.preparePointerSelection(story.target, 2)) return false;
  }
  host.editor.commands.setTextSelection({ from: target.anchor, to: target.head });
  if (main && !isAcceptedMainTextTarget(target, host.editor.state.pm)) return false;
  if (region !== "header" && region !== "footer") host.headerFooterEditing.exit();
  host.cancelDrawing();
  host.claim(story?.target ?? null);
  host.editor.commands.scrollIntoView();
  if (activation?.focus !== false) input.focus();
  host.render();
  return true;
}

/**
 * Selects text inside a text box and enters its drawing-text session.
 *
 * @param host - Mounted interaction host.
 * @param input - Input binding owning keyboard focus.
 * @param target - Version-bound canonical text selection.
 * @param activation - Optional focus policy.
 * @returns Whether a laid-out text box owns both endpoints.
 */
function activateDrawingText(
  host: MountedTextActivationHost,
  input: NonNullable<MountedTextActivationHost["inputBinding"]>,
  target: QuireMountedTextTarget,
  activation: QuireMountedTextActivationOptions | undefined
): boolean {
  const session = host.resolveDrawingText(target.head);
  const range = session?.interactionTarget.source?.range;
  if (session === undefined || range === undefined || target.anchor < range.from || target.anchor > range.to) {
    return false;
  }
  input.resetTransientState({ restartNativeInput: "if-needed" });
  host.headerFooterEditing.exit();
  host.editor.commands.setTextSelection({ from: target.anchor, to: target.head });
  host.enterDrawingText(session, activation?.focus !== false);
  host.editor.commands.scrollIntoView();
  return true;
}
