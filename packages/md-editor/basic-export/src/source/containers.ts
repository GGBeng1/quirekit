/** Container names mapped to the GitHub alert kinds the Word converter styles as callouts. */
const alerts: Readonly<Record<string, string>> = {
  note: 'NOTE', info: 'NOTE', tip: 'TIP', success: 'TIP', important: 'IMPORTANT',
  warning: 'WARNING', caution: 'CAUTION', danger: 'CAUTION', error: 'CAUTION',
};

/** One open named container. */
export interface OpenContainer {
  /** Colon count of the opening fence; a closing fence needs at least as many. */ readonly colons: number;
}

/** @param line - Source line outside code. @returns Opening fence parts, if the line opens a named container. */
export function containerOpening(line: string): { colons: number; name: string; title: string } | undefined {
  const match = /^(:{3,})[ \t]*([A-Za-z][\w-]*)(.*)$/u.exec(line);
  if (!match) return undefined;
  return { colons: match[1]!.length, name: match[2]!.toLowerCase(), title: match[3]!.replace(/\{[^}]*\}\s*$/u, '').trim() };
}

/** @param line - Source line outside code. @param open - Containers from outermost to innermost. @returns How many containers the line closes. */
export function containerClosing(line: string, open: readonly OpenContainer[]): number {
  const match = /^(:{3,})[ \t]*$/u.exec(line);
  if (!match || !open.length) return 0;
  // A closing fence ends the innermost container it is long enough for.
  const colons = match[1]!.length;
  for (let index = open.length - 1; index >= 0; index--) if (open[index]!.colons <= colons) return open.length - index;
  return 0;
}

/**
 * @param name - Container role.
 * @param title - Literal heading after the role.
 * @param prefix - Blockquote prefix of the container's own depth.
 * @param withAlerts - Whether the target styles GitHub alerts.
 * @returns Lines that start the quoted container.
 */
export function containerHeader(name: string, title: string, prefix: string, withAlerts: boolean): readonly string[] {
  const alert = withAlerts ? alerts[name] : undefined;
  return [...(alert ? [`${prefix}[!${alert}]`] : []), ...(title ? [`${prefix}**${title}**`] : []), prefix.trimEnd()];
}
