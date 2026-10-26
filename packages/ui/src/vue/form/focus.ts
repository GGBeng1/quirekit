/** Focuses the first operable invalid field in document order.
 * @param root - Native form that owns the field wrappers.
 * @param errors - Current path-to-error map.
 */
export function focusFormError(root: HTMLFormElement | undefined, errors: Record<string, string | undefined>): void {
  if (!root) return;
  for (const field of root.querySelectorAll<HTMLElement>("[data-form-field]")) {
    const name = field.dataset.formField;
    if (!name || !errors[name]) continue;
    const controls = field.querySelectorAll<HTMLElement>('[data-form-control] input:not([type="hidden"]),[data-form-control] textarea,[data-form-control] select,[data-form-control] button,[data-form-control] [tabindex]');
    for (const control of controls) {
      if (control.matches(':disabled,[aria-disabled="true"],[readonly],[aria-readonly="true"]')) continue;
      if (control.closest('[hidden],[inert],[aria-hidden="true"]') || (control.hasAttribute("tabindex") && control.tabIndex < 0)) continue;
      const style = control.ownerDocument.defaultView?.getComputedStyle(control);
      if (style?.display === "none" || style?.visibility === "hidden") continue;
      control.focus();
      if (control.ownerDocument.activeElement === control) return;
    }
  }
}
