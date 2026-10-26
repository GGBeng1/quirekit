import type { CommandSpec } from "@quirekit/core";
import { collectWordNumberingPresetRegistry } from "../../presets/registry";
import type { ApplyWordNumberingPresetOptions } from "../../presets/types";
import { compileWordNumberingTemplate } from "../../templates/compiler";
import type {
  ApplyWordNumberingTemplateOptions,
  WordNumberingTemplateDraft
} from "../../templates/types";
import { applyWordNumberingPreset } from "./apply";

/**
 * Creates the explicit extension-contributed numbering-preset command.
 *
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Command that materializes and applies one semantic preset atomically.
 */
export function createApplyWordNumberingPresetCommand(
  paragraphTypes: readonly string[]
): CommandSpec {
  return (value) => (context) => {
    const presetId = readPresetId(value);
    if (presetId === undefined) return false;
    const preset = collectWordNumberingPresetRegistry(
      context.editor.extensions
    ).get(presetId);
    return preset === undefined
      ? false
      : applyWordNumberingPreset(context, paragraphTypes, preset);
  };
}

/**
 * Creates the friendly partial-template application command.
 *
 * The command compiles against the mounted extension registry and immediately
 * materializes the resulting immutable preset, so products do not need a
 * temporary extension or a second document mutation.
 *
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Command that compiles and applies one template atomically.
 */
export function createApplyWordNumberingTemplateCommand(
  paragraphTypes: readonly string[]
): CommandSpec {
  return (value) => (context) => {
    const draft = readTemplateDraft(value);
    if (draft === undefined) return false;
    const preset = compileWordNumberingTemplate(
      draft,
      collectWordNumberingPresetRegistry(context.editor.extensions)
    );
    return applyWordNumberingPreset(context, paragraphTypes, preset);
  };
}

/**
 * Parses one command payload without accepting implicit ids or extra primitives.
 *
 * @param value - Candidate command payload.
 * @returns Stable preset id or undefined.
 */
function readPresetId(value: unknown): string | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const presetId = (value as ApplyWordNumberingPresetOptions).presetId;
  return typeof presetId === "string" && presetId.length > 0
    ? presetId
    : undefined;
}

/**
 * Parses the explicit wrapper used by the public template command.
 *
 * Detailed field validation remains compiler-owned so callers receive one
 * consistent diagnostic contract whether they compile or apply directly.
 *
 * @param value - Candidate command payload.
 * @returns Friendly template draft or undefined.
 */
function readTemplateDraft(
  value: unknown
): WordNumberingTemplateDraft | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const draft = (value as ApplyWordNumberingTemplateOptions).draft;
  return draft !== null && typeof draft === "object" && !Array.isArray(draft)
    ? draft
    : undefined;
}
