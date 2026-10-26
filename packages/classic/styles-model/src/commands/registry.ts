import { linkedStyleText } from "../model/text/toggles";
import { admitsWordStyleBase } from "./named/validation";
import { normalizeWordStyleTextEdit } from "../model/text/edit";
import type { CommandSpec } from "@quirekit/core";
import { synchronizeWordStyleFontSize } from "../model/text-size";
import {
  createDefaultWordParagraphStyleRegistry,
  isWordParagraphStyleRegistry,
  resolveWordParagraphStyleRegistry,
  type WordParagraphStyleRegistry
} from "../model";
import {
  isSetWordParagraphStyleRegistryOptions,
  isUpdateWordParagraphStyleOptions
} from "./validation";

/**
 * Creates the document paragraph style registry replacement command.
 *
 * Complete replacement keeps codec imports and future style-management
 * transactions atomic and undoable.
 *
 * @returns Command that stores one validated complete registry on the document.
 */
export function createSetWordParagraphStyleRegistryCommand(): CommandSpec {
  return (value) => (context) => {
    if (!isSetWordParagraphStyleRegistryOptions(value)) return false;
    return replaceRegistry(context, value.registry);
  };
}

/**
 * Creates the command that replaces one existing unlocked named style.
 *
 * @returns Command that preserves the target style id and updates atomically.
 */
export function createUpdateWordParagraphStyleCommand(): CommandSpec {
  return (value) => (context) => {
    if (!isUpdateWordParagraphStyleOptions(value)) return false;
    const registry = resolveWordParagraphStyleRegistry(
      context.tr.doc.attrs.wordStyleRegistry
    );
    const existingStyle = registry.styles[value.style.id];
    if (existingStyle === undefined || existingStyle.locked) return false;
    if (existingStyle.default !== value.style.default || existingStyle.link !== value.style.link
      || !admitsWordStyleBase(registry, value.style.id, value.style.basedOn, false)
      || (value.style.next !== null && !registry.styles[value.style.next])) return false;
    const next = synchronizeWordStyleFontSize(existingStyle, value.style);
    const style = { ...next, text: normalizeWordStyleTextEdit(existingStyle.text, next.text) };
    const linked = style.link ? registry.characterStyles?.[style.link] : undefined;
    if (linked?.locked) return false;
    const candidate: WordParagraphStyleRegistry = {
      ...registry,
      styles: {
        ...registry.styles,
        [value.style.id]: style
      },
      ...(linked === undefined ? {} : { characterStyles: { ...registry.characterStyles, [linked.id]: { ...linked, text: linkedStyleText(linked.text, style.text, false) } } })
    };
    if (!isWordParagraphStyleRegistry(candidate)) return false;
    return replaceRegistry(context, candidate);
  };
}

/**
 * Creates the command that restores the built-in named style registry.
 *
 * @returns Command that atomically restores fresh built-in definitions.
 */
export function createResetWordParagraphStyleRegistryCommand(): CommandSpec {
  return () => (context) => {
    const defaults = createDefaultWordParagraphStyleRegistry();
    const current = resolveWordParagraphStyleRegistry(
      context.tr.doc.attrs.wordStyleRegistry
    );
    if (registriesEqual(current, defaults)) return false;
    return replaceRegistry(context, defaults);
  };
}

/**
 * Stores one registry on the current document when it differs from raw state.
 *
 * @param context - Active editor command context.
 * @param registry - Valid complete registry to store.
 * @returns Whether a document transaction was dispatched.
 */
function replaceRegistry(
  context: Parameters<CommandSpec>[0],
  registry: WordParagraphStyleRegistry
): boolean {
  if (!context.editor.isEditable || context.tr.doc.attrs.wordDocumentProtection?.enforcement) return false;
  if (registriesEqual(context.tr.doc.attrs.wordStyleRegistry, registry)) {
    return false;
  }
  context.tr.setDocAttribute("wordStyleRegistry", registry);
  context.dispatch?.(context.tr);
  return true;
}

/**
 * Compares JSON-safe registries structurally.
 *
 * @param left - First candidate registry.
 * @param right - Second candidate registry.
 * @returns Whether both values have identical JSON structure.
 */
function registriesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
