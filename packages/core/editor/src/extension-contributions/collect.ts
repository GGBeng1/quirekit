import type { QuireAnyExtension } from "../types";
import { getExtensionField } from "../helpers/getExtensionField";
import type {
  QuireExtensionContributionFactoryContext,
  QuireOwnedExtensionContribution
} from "./types";

/** Leaf-package factory shape resolved from one named extension config hook. */
type QuireExtensionContributionFactory<Contribution> = (
  context: QuireExtensionContributionFactoryContext
) => readonly Contribution[];

/**
 * Collects one explicitly named contribution hook from resolved extensions.
 *
 * Leaf packages own the hook name and contribution type. Core only supplies
 * deterministic extension traversal and Tiptap-compatible field inheritance,
 * so it never imports View, OOXML, or product UI contracts.
 *
 * @param extensions - Resolved extensions in manager order.
 * @param field - Exact leaf-package hook name such as `addToolbarItems`.
 * @returns Frozen contributions annotated with their extension owner.
 */
export function collectQuireExtensionContributions<Contribution>(
  extensions: readonly QuireAnyExtension[],
  field: string
): readonly QuireOwnedExtensionContribution<Contribution>[] {
  const owned: QuireOwnedExtensionContribution<Contribution>[] = [];

  for (const extension of extensions) {
    const context: QuireExtensionContributionFactoryContext = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
      extensions
    };
    const factory = getExtensionField<QuireExtensionContributionFactory<Contribution>>(
      extension,
      field,
      context as unknown as Readonly<Record<string, unknown>>
    );
    if (factory === undefined) continue;
    if (typeof factory !== "function") {
      throw new TypeError(
        `Extension contribution hook "${field}" on "${extension.name}" must be a function.`
      );
    }
    const contributions = factory(context);
    if (!Array.isArray(contributions)) {
      throw new TypeError(
        `Extension contribution hook "${field}" on "${extension.name}" must return an array.`
      );
    }
    for (const contribution of contributions) {
      owned.push(Object.freeze({
        extension,
        extensionName: extension.name,
        contribution
      }));
    }
  }

  return Object.freeze(owned);
}
