import { linkedStyleText } from "../../model/text/toggles";
import { normalizeWordStyleTextEdit } from "../../model/text/edit";
import type { CommandSpec } from "@quirekit/core";
import { createChainableState } from "@quirekit/core";
import { collectSelectedWordParagraphs } from "@quirekit/classic-paragraph-model";
import { resolveWordParagraphStyleRegistry } from "../../model/registry";
import { createApplyWordParagraphStyleCommand } from "../apply";
import { storeNamedStyles } from "./create";
import { admitsWordStyleBase, isWordNamedCharacterStyle } from "./validation";
import { isWordStyleRevisionTracking } from "./admission";

/** @returns Character style application/removal preserving unrelated direct formatting. */
export function createApplyWordCharacterStyleCommand(): CommandSpec {
  return (options) => (context) => {
    if (!options || typeof options !== "object" || !context.editor.isEditable || isWordStyleRevisionTracking(context)) return false;
    const id = (options as { styleId?: unknown }).styleId;
    const registry = resolveWordParagraphStyleRegistry(context.tr.doc.attrs.wordStyleRegistry);
    if (id !== null && (typeof id !== "string" || !registry.characterStyles?.[id])) return false;
    const markType = context.state.schema.marks.wordCharacterStyle;
    if (!markType) return false;
    const { from, to, empty, $from } = context.tr.selection;
    if (!$from.parent.inlineContent) return false;
    if (empty) {
      if (id === null) context.tr.removeStoredMark(markType);
      else context.tr.addStoredMark(markType.create({ styleId: id }));
    } else {
      context.tr.removeMark(from, to, markType);
      if (id !== null) context.tr.addMark(from, to, markType.create({ styleId: id }));
    }
    context.dispatch?.(context.tr);
    return true;
  };
}

/** @returns Complete character definition update with stable identity and cycle checks. */
export function createUpdateWordCharacterStyleCommand(): CommandSpec {
  return (options) => (context) => {
    if (!options || typeof options !== "object" || !context.editor.isEditable || context.tr.doc.attrs.wordDocumentProtection?.enforcement
      || isWordStyleRevisionTracking(context)) return false;
    const style = (options as { style?: unknown }).style;
    if (!isWordNamedCharacterStyle(style)) return false;
    const registry = resolveWordParagraphStyleRegistry(context.tr.doc.attrs.wordStyleRegistry), prior = registry.characterStyles?.[style.id];
    if (!prior || prior.locked || prior.default !== style.default || prior.link !== style.link
      || !admitsWordStyleBase(registry, style.id, style.basedOn, true)) return false;
    const next = { ...style, text: normalizeWordStyleTextEdit(prior.text, style.text) };
    const linked = style.link ? registry.styles[style.link] : undefined;
    if (linked?.locked) return false;
    return storeNamedStyles(context, { ...registry, characterStyles: { ...registry.characterStyles, [style.id]: next },
      ...(linked === undefined ? {} : { styles: { ...registry.styles, [linked.id]: { ...linked, text: linkedStyleText(linked.text, next.text, true) } } }) });
  };
}

/** @param nodeNames - Paragraph owners. @returns Selection-aware linked style application. */
export function createApplyWordLinkedStyleCommand(nodeNames: readonly string[]): CommandSpec {
  return (options) => (context) => {
    const id = (options as { styleId?: unknown } | null)?.styleId;
    if (typeof id !== "string" || !context.editor.isEditable) return false;
    const registry = resolveWordParagraphStyleRegistry(context.tr.doc.attrs.wordStyleRegistry), style = registry.styles[id];
    if (!style) return false;
    const { empty, $from, $to } = context.tr.selection;
    if (style.link && !empty && $from.sameParent($to)
      && ($from.parentOffset > 0 || $to.parentOffset < $to.parent.content.size)) {
      return createApplyWordCharacterStyleCommand()({ styleId: style.link })(context);
    }
    const state = createChainableState({ state: context.state, transaction: context.tr });
    const targets = collectSelectedWordParagraphs(state, nodeNames);
    if (style.link && isWordStyleRevisionTracking(context)) {
      let hasCharacterHalf = false;
      // Paragraph promotion clears its entire character half, including runs
      // outside a caret selection. Admit the full mutation range before editing.
      for (const target of targets) target.node.descendants(node => {
        if (node.marks.some(mark => mark.type.name === "wordCharacterStyle" && mark.attrs.styleId === style.link)) hasCharacterHalf = true;
        return !hasCharacterHalf;
      });
      if (hasCharacterHalf) return false;
    }
    // A linked style has one effective identity per occurrence. Promoting its
    // character half to a paragraph must not leave a second toggle layer behind.
    const before = context.tr.steps.length;
    createApplyWordParagraphStyleCommand(nodeNames)({ styleId: id })({ ...context, dispatch: undefined });
    const markType = context.state.schema.marks.wordCharacterStyle;
    if (style.link && markType) {
      const mark = markType.create({ styleId: style.link });
      for (const target of targets) {
        context.tr.removeMark(target.position + 1, target.position + target.node.nodeSize - 1, mark);
      }
      context.tr.removeStoredMark(mark);
    }
    if (context.tr.steps.length === before) return false;
    context.dispatch?.(context.tr.scrollIntoView());
    return true;
  };
}
