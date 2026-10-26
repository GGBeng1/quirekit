import type { WordListKind } from "../types";
import { readWordNumberingSequenceActionState } from "../selection/sequence-actions";
import type { WordNumberingMarkerAction } from "./types";

/**
 * Supplies identical marker actions and availability to every product surface.
 * @param position - Exact paragraph position captured by the marker interaction.
 * @param kind - Canonical marker family.
 * @returns Ordered menu actions; task checkboxes have their own direct interaction.
 */
export function createWordNumberingMarkerActions(position: number, kind: WordListKind): readonly WordNumberingMarkerAction[] {
  if (kind === "task") return [];
  const clear: WordNumberingMarkerAction = {
    id: "clear", label: kind === "ordered" ? "undoAutomaticNumbering" : "removeBullets",
    execute: editor => editor.commands.clearWordListAtPosition({ position }),
    canExecute: editor => editor.can().clearWordListAtPosition({ position })
  };
  if (kind !== "ordered") return [clear];
  return [{
    id: "restart", label: "restartNumbering",
    execute: editor => editor.commands.restartWordNumberingAtPosition({ position, start: 1 }),
    canExecute: editor => (readWordNumberingSequenceActionState(editor.state, position)?.canRestart ?? false)
      && editor.can().restartWordNumberingAtPosition({ position, start: 1 })
  }, {
    id: "continue", label: "continueNumbering",
    execute: editor => editor.commands.continueWordNumberingAtPosition({ position }),
    canExecute: editor => readWordNumberingSequenceActionState(editor.state, position)?.canContinue ?? false
  }, clear];
}
