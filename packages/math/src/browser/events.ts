/**
 * Registers native listeners with one explicit, idempotent lifetime.
 * @param target - Consumer-owned native element.
 * @param handlers - Event names and normalized handlers.
 * @returns Removes only listeners installed by this binding.
 */
export function bindMathEvents(target: EventTarget, handlers: Readonly<Record<string, (event: Event) => void>>): () => void {
  for (const [name, handler] of Object.entries(handlers)) target.addEventListener(name, handler);
  return () => { for (const [name, handler] of Object.entries(handlers)) target.removeEventListener(name, handler); };
}
