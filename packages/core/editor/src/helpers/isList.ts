import type { QuireAnyExtension } from "../types";
import { getExtensionField } from "./getExtensionField";
import { splitExtensions } from "./splitExtensions";

/**
 * Reports whether a node extension belongs to the `list` group.
 *
 * @param name - Node extension name to inspect.
 * @param extensions - Resolved extensions.
 * @returns Whether the node extension declares the `list` group.
 */
export function isList(
  name: string,
  extensions: readonly QuireAnyExtension[]
): boolean {
  const { nodeExtensions } = splitExtensions(extensions);
  const extension = nodeExtensions.find((item) => item.name === name);

  if (!extension) {
    return false;
  }

  const groupField = getExtensionField<string | (() => string)>(extension, "group", {
    name: extension.name,
    options: extension.options,
    storage: extension.storage
  });
  const group = typeof groupField === "function" ? groupField() : groupField;

  if (typeof group !== "string") {
    return false;
  }

  return group.split(" ").includes("list");
}
