import type { MdDocxDiagnostic } from '@quirekit/md-editor';

/**
 * @param direction - Direction relative to the produced or consumed file.
 * @param code - Stable code; md-editor's report owns the localized text.
 * @param path - Source line or converter location.
 * @param message - English explanation used when no localized text exists.
 * @param disposition - What happened to the construct.
 * @returns One report entry that counts as a loss.
 */
export function loss(direction: MdDocxDiagnostic['direction'], code: string, path: string, message: string,
  disposition: MdDocxDiagnostic['disposition'] = 'approximated'): MdDocxDiagnostic {
  return { direction, code, path, severity: 'warning', disposition, message };
}

/**
 * @param direction - Direction relative to the produced file.
 * @param code - Stable code.
 * @param message - English explanation.
 * @returns One informational entry that does not count as a loss.
 */
export function note(direction: MdDocxDiagnostic['direction'], code: string, message: string): MdDocxDiagnostic {
  return { direction, code, path: '/', severity: 'info', disposition: 'projected', message };
}
