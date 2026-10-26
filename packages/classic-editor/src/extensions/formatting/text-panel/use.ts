import { projectTextScale } from "./scale/projection";
import { applyTextScale } from "./scale/commands";
import { isUnderlineStyle, readUnderlineAttributes } from "@quirekit/extension-underline";
import { readEffectiveDirectEmphasisState } from "@quirekit/extension-text-style";
import { computed, onBeforeUnmount, shallowRef } from "vue";
import type { ClassicEditorRenderContext } from "@classic/types";
import { collectClassicSelectedTextSegments } from "@classic/extensions/typography/effective-format/selection";
import { resolveClassicEffectiveFontSize } from "@classic/extensions/typography/effective-format";
import { resolveClassicHighlightToken } from "@classic/extensions/typography/highlight-palette";
import { textPanelMessage } from "./copy";
import type { TextPanelMessage } from "./types";
import type { TextEffect } from "./effects/types";
import { projectTextEffects } from "./effects/projection";
import { applyTextEffect } from "./effects/commands";
import { collectClassicSelectedCanvasStyles } from "@classic/extensions/typography/effective-format/canvas-style";
import { projectHiddenText } from "./hidden/projection";
import { applyHiddenText } from "./hidden/commands";
import { projectCharacterGrid } from "./grid/projection";
import { applyCharacterGrid } from "./grid/commands";

/** @param read - Latest mounted context. @returns Selection-scoped state and native authoring adapters. */
export function useTextPanel(read: () => ClassicEditorRenderContext) {
  const editor = read().editor;
  const snapshot = shallowRef(editor.state.pm);
  const editable = shallowRef(editor.isEditable);
  /** Refresh only if an input to character projection changed. */
  function refresh(): void {
    editable.value = editor.isEditable;
    const next = editor.state.pm, previous = snapshot.value;
    if (next.doc !== previous.doc || !next.selection.eq(previous.selection) || next.storedMarks !== previous.storedMarks) snapshot.value = next;
  }
  editor.on("transaction", refresh);
  editor.on("update", refresh);
  onBeforeUnmount(() => { editor.off("transaction", refresh); editor.off("update", refresh); });
  const context = computed(() => { void snapshot.value; void editable.value; return { ...read() }; });
  const segments = computed(() => { void snapshot.value; return collectClassicSelectedTextSegments(editor); });
  const valueCache = computed(() => { void snapshot.value; return new Map<string, unknown>(); });
  const disabled = computed(() => !editable.value);
  const canvasStyles = computed(() => collectClassicSelectedCanvasStyles(editor, segments.value));
  const effects = computed(() => projectTextEffects(canvasStyles.value));
  const scale = computed(() => projectTextScale(canvasStyles.value));
  const characterGrid = computed(() => projectCharacterGrid(canvasStyles.value));
  /** @param enabled - Direct override or inherited state. @returns Whether the complete grid edit is allowed. */
  function canSetCharacterGrid(enabled: boolean | null): boolean { return applyCharacterGrid(editor, enabled, true); }
  /** @param enabled - Direct override or inherited state. @returns Whether one reversible grid edit was accepted. */
  function setCharacterGrid(enabled: boolean | null): boolean { return canSetCharacterGrid(enabled) && applyCharacterGrid(editor, enabled); }
  /**
   * Applies a width change after checking the current selection's edit policies.
   * @param percentage - Width percentage or null to restore inheritance.
   * @returns Whether one atomic edit was accepted.
   */
  function setScale(percentage: number | null): boolean { return applyTextScale(editor, percentage, true) && applyTextScale(editor, percentage); }
  const hidden = computed(() => projectHiddenText(canvasStyles.value));
  /** @param enabled - Explicit hidden state. @returns Whether the complete edit is allowed without dispatch. */
  function canSetHidden(enabled: boolean): boolean { return applyHiddenText(editor, enabled, true); }
  /** @param enabled - Explicit hidden state. @returns Whether one independent format edit was accepted. */
  function setHidden(enabled: boolean): boolean { return canSetHidden(enabled) && applyHiddenText(editor, enabled); }
  /** @param effect - Requested checkbox. @param enabled - Explicit state. @returns Whether the full edit is admissible without dispatch. */
  function canSetEffect(effect: TextEffect, enabled: boolean): boolean { return applyTextEffect(editor, effect, enabled, true); }
  /** @param effect - Requested checkbox. @param enabled - Explicit state. @returns Whether one atomic edit was accepted. */
  function setEffect(effect: TextEffect, enabled: boolean): boolean { return canSetEffect(effect, enabled) && applyTextEffect(editor, effect, enabled); }
  /** @param key - Message identity. @returns Localized copy. */
  function message(key: TextPanelMessage): string { return textPanelMessage(context.value.locale, key); }
  /** @param name - Mark owner. @param field - Optional scalar attribute. @param fallback - Value for absent attributes. @returns Uniform selection value, or undefined for mixed. */
  function value(name: string, field?: string, fallback: unknown = null): unknown {
    const key = `${name}:${field ?? ""}:${String(fallback)}`;
    if (valueCache.value.has(key)) return valueCache.value.get(key);
    if (!field && (name === "bold" || name === "italic")) {
      const result = readEffectiveDirectEmphasisState(editor.state, name);
      valueCache.value.set(key, result); return result;
    }
    const values = segments.value.map(segment => {
      const mark = segment.marks.find(item => item.type.name === name);
      const attrs = mark && name === "underline" ? readUnderlineAttributes(mark.attrs) : mark?.attrs;
      return field ? attrs?.[field as keyof typeof attrs] ?? fallback : !!mark;
    });
    const result = values.every(item => item === values[0]) ? values[0] : undefined;
    valueCache.value.set(key, result); return result;
  }
  const size = computed(() => { void snapshot.value; const state = resolveClassicEffectiveFontSize(editor); return state.kind === "single" ? state.value : null; });
  /** @param action - Native command invocation. @returns Whether it was accepted. */
  function run(action: () => boolean): boolean { return editor.isEditable && action(); }
  /** @param color - RGB or automatic. */
  function setColor(color: string | null): void { run(() => color === null ? editor.commands.unsetColor() : editor.commands.setColor(color)); }
  /** @param color - Palette color, or null to remove the direct highlight. */
  function setHighlight(color: string | null): void {
    const token = color === null ? null : resolveClassicHighlightToken(color);
    if (token !== undefined) run(() => token === null ? editor.commands.unsetHighlight() : editor.commands.setHighlight({ color: token }));
  }
  /** @param color - RGB or automatic. */
  function setUnderlineColor(color: string | null): void { run(() => editor.commands.setUnderline({ color })); }
  /** @param token - Validated UI style. */
  function setUnderline(token: string): void { if (isUnderlineStyle(token)) run(() => editor.commands.setUnderline({ underlineType: token })); }
  /** @param token - Exact emphasis token. */
  function setEmphasis(token: string | number | null | undefined): void {
    if (token === "none" || token === "dot" || token === "underDot" || token === "comma" || token === "circle") run(() => editor.commands.setEmphasisMark(token));
  }
  /** @param points - Finite field value in points. */
  function setSize(points: string | number | null | undefined): void {
    const number = Number(points);
    if (number >= 1 && number <= 300) run(() => editor.commands.setFontSize(`${number}pt`));
  }
  return { context, editor, disabled, message, value, size, scale, setScale, run, setColor, setHighlight, setUnderlineColor, setUnderline, setEmphasis, setSize, effects, canSetEffect, setEffect, hidden, canSetHidden, setHidden, characterGrid, canSetCharacterGrid, setCharacterGrid };
}
