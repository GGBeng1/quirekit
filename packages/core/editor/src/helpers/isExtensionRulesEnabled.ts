import type { QuireAnyExtension, QuireEnableRules } from "../types";

/**
 * Reports whether input or paste rules should run for an extension.
 *
 * @param extension - Extension whose rules are being inspected.
 * @param enabled - Global boolean or extension-name whitelist.
 * @returns Whether the extension's rules are enabled.
 */
export function isExtensionRulesEnabled(
  extension: QuireAnyExtension,
  enabled: QuireEnableRules
): boolean {
  if (typeof enabled === "boolean") {
    return enabled;
  }

  return enabled.some((enabledExtension) => {
    const name = typeof enabledExtension === "string"
      ? enabledExtension
      : enabledExtension.name;

    return name === extension.name;
  });
}
