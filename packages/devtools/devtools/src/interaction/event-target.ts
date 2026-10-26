/**
 * Tests whether product UI explicitly opts out of editor latency ownership.
 *
 * @param target - Browser event target within the observed editor shell.
 * @returns Whether an ancestor excludes this interaction from editor tracing.
 */
export function isIgnoredInteraction(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest("[data-qk-devtools-ignore-interactions]") !== null;
}

/**
 * Creates a compact event target label for the panel.
 *
 * @param target - Event target to describe.
 * @returns Compact element label.
 */
export function describeEventTarget(target: EventTarget | null): string {
  if (!(target instanceof Element)) {
    return "unknown";
  }

  const tag = target.tagName.toLowerCase();
  const id = target.id ? `#${target.id}` : "";
  const className = [...target.classList].slice(0, 2).join(".");
  const classes = className ? `.${className}` : "";

  return `${tag}${id}${classes}`;
}
