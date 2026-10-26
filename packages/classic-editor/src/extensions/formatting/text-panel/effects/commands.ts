import type { CommandProps, QuireEditor } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import type { TextEffect } from "./types";

/** @param editor - Mounted editor. @param effect - Requested effect. @returns Whether its public authoring commands exist. */
export function hasTextEffectCommand(editor: QuireEditor, effect: TextEffect): boolean {
  if (effect === "outline") return typeof editor.commands.setTextOutline === "function";
  if (effect === "shadow") return typeof editor.commands.setTextShadow === "function";
  return typeof editor.commands.setTextEmboss === "function" && typeof editor.commands.setTextImprint === "function";
}

/** @param editor - Latest public editor. @param effect - Effect to change. @param enabled - Explicit boolean state. @param dryRun - Preflight without dispatch. @returns Whether the atomic effect edit is admitted. */
export function applyTextEffect(editor: QuireEditor, effect: TextEffect, enabled: boolean, dryRun = false): boolean {
  if (!editor.isEditable || !hasTextEffectCommand(editor, effect)) return false;
  let chain = (dryRun ? editor.can().chain() : editor.chain()).command(
    /** @param props - Shared transaction. @returns Accepted independent history boundary. */
    (props: CommandProps) => { closeHistory(props.tr); return true; }
  );
  if (effect === "outline") chain = chain.setTextOutline(enabled);
  else if (effect === "shadow") chain = chain.setTextShadow(enabled);
  else if (effect === "emboss") {
    chain = chain.setTextEmboss(enabled);
    if (enabled) chain = chain.setTextImprint(false);
  } else {
    chain = chain.setTextImprint(enabled);
    if (enabled) chain = chain.setTextEmboss(false);
  }
  return chain.command(
    /** @param props - Complete atomic transaction. @returns Whether installed filters admit the full change. */
    (props: CommandProps) => {
      const allowed = editor.state.pm.filterTransaction(props.tr);
      if (!allowed) props.tr.setMeta("preventDispatch", true);
      return allowed;
    }
  ).run();
}
