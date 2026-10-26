import type { QuireKitTableTokens } from "../types";

/**
 * Projects table configuration into directly traceable CSS variables.
 * @param tokens - Theme-derived table configuration.
 * @returns Explicit variable declarations.
 */
export function createTableCssVariables(tokens: QuireKitTableTokens): Readonly<Record<string, string>> {
  return Object.freeze({
    "--qk-table-foreground": tokens.foreground,
    "--qk-table-muted-foreground": tokens.mutedForeground,
    "--qk-table-header-background": tokens.headerBackground,
    "--qk-table-current-background": tokens.currentBackground,
    "--qk-table-border-color": tokens.borderColor,
    "--qk-table-border-width": tokens.borderWidth,
    "--qk-table-compact-padding": tokens.compactPadding,
    "--qk-table-padding": tokens.padding,
    "--qk-table-comfortable-padding": tokens.comfortablePadding
  });
}
