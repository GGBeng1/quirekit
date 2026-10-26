import type { QuireKitTheme } from "@quirekit/ui";
import type { FlowchartAppearance } from "@quirekit/flowchart-x6";
/** @param theme - Shared public theme. @returns Display projection without source mutations. */
export function flowEditorAppearance(theme: QuireKitTheme): FlowchartAppearance {
  return { primary: theme.color.action.primary, surface: theme.color.surface.page,
    runColors: { pending: theme.color.text.tertiary, running: theme.color.action.primary, completed: theme.color.success.text, reused: theme.color.info.text, invalid: theme.color.danger.text },
    text: theme.color.text.primary, line: theme.color.text.secondary, fontFamily: theme.typography.body.fontFamily };
}
