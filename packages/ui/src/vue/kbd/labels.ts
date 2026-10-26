const keyNames: Readonly<Record<string, string>> = { "⌘": "Command", "⌥": "Option", "⌃": "Control", "⇧": "Shift", "↵": "Enter", "↑": "Arrow up", "↓": "Arrow down", "←": "Arrow left", "→": "Arrow right", "Esc": "Escape" };
/**
 * Expands ambiguous key symbols without guessing the host platform.
 * @param keys - Explicit key sequence supplied by the host.
 * @returns A readable shortcut name, replaceable through the label prop.
 */
export function keyLabel(keys: readonly string[]): string {
  return keys.map(key => keyNames[key] ?? key).join(" + ");
}
