import type {
  DocxManagerContribution,
  DocxManagerContributionEntry
} from "@quirekit/docx";
import {
  getExtensionField
} from "../helpers/getExtensionField";
import type { QuireEditor } from "../Editor";
import type {
  QuireAnyExtension,
  QuireDocxContributionFactory,
  QuireExtensionThisContext,
  QuireJSONContent
} from "../types";

/** Canonical Quire mark JSON used by Editor-owned DOCX contributions. */
export type QuireDocxMark =
  NonNullable<QuireJSONContent["marks"]>[number];

/** Contribution entry specialized to the canonical Quire JSON model. */
export type QuireDocxContributionEntry = DocxManagerContributionEntry<
  QuireJSONContent,
  QuireDocxMark,
  QuireJSONContent
>;

/**
 * Collects `addDocx()` once from one Editor's resolved extension set.
 *
 * Core owns deterministic traversal and extension-field inheritance. The DOCX
 * package validates semantic claims when the Editor-owned Manager is first
 * used.
 *
 * @param extensions - Resolved extensions in ExtensionManager order.
 * @param editor - Optional owning Editor exposed to editor-bound factories.
 * @returns Frozen owner/contribution entries for one Editor instance.
 */
export function collectQuireDocxContributionEntries(
  extensions: readonly QuireAnyExtension[],
  editor?: QuireEditor | undefined
): readonly QuireDocxContributionEntry[] {
  const entries: QuireDocxContributionEntry[] = [];
  for (const extension of extensions) {
    const context: QuireExtensionThisContext<object, object> = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
      parent: undefined,
      extensions,
      ...(editor === undefined ? {} : { editor })
    };
    const factory = getExtensionField<
      QuireDocxContributionFactory<object, object>
    >(
      extension,
      "addDocx",
      context as unknown as Readonly<Record<string, unknown>>
    );
    if (factory === undefined) continue;
    if (typeof factory !== "function") {
      throw new TypeError(
        `Extension contribution hook "addDocx" on "${extension.name}" must be a function.`
      );
    }
    const value = factory.call(context, context);
    for (const contribution of normalizeDocxContributions(
      value,
      extension.name
    )) {
      entries.push(Object.freeze({
        ownerId: extension.name,
        contribution
      }));
    }
  }
  return Object.freeze(entries);
}

/**
 * Normalizes one optional single-or-array hook result.
 *
 * @param value - Raw hook result.
 * @param extensionName - Owner used by validation errors.
 * @returns Contributions in extension declaration order.
 */
function normalizeDocxContributions(
  value: ReturnType<QuireDocxContributionFactory<object, object>>,
  extensionName: string
): readonly DocxManagerContribution<
  QuireJSONContent,
  QuireDocxMark,
  QuireJSONContent
>[] {
  if (value === null || value === undefined) return [];
  const contributions = Array.isArray(value) ? value : [value];
  for (const contribution of contributions) {
    if (contribution === null
      || typeof contribution !== "object"
      || typeof contribution.id !== "string"
      || typeof contribution.kind !== "string") {
      throw new TypeError(
        `Extension contribution hook "addDocx" on "${extensionName}" returned an invalid contribution.`
      );
    }
  }
  return contributions;
}
