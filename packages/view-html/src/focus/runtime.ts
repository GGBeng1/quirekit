import type {
  CreateHtmlFocusRuntimeOptions,
  HtmlFocusOwner,
  HtmlFocusRuntime,
  HtmlFocusScope
} from "./types";

/** Data attribute used by internal preserving UI and nested embed owners. */
const focusScopeDatasetKey = "qkFocusScope";

/** Creates one retained HTML focus ownership controller. */
class DefaultHtmlFocusRuntime implements HtmlFocusRuntime {
  private currentOwner: HtmlFocusOwner = "outside";
  private readonly handleFocusIn: EventListener;
  private readonly handleFocusOut: EventListener;

  /**
   * Creates focus ownership and binds browser focus transitions.
   *
   * @param options - Mounted roots, input proxy, and transition observer.
   */
  constructor(private readonly options: CreateHtmlFocusRuntimeOptions) {
    this.handleFocusIn = (event) => {
      this.transitionTo(resolveEventNode(event.target));
    };
    this.handleFocusOut = (event) => {
      const focusEvent = event as FocusEvent;
      queueMicrotask(() => {
        const target = focusEvent.relatedTarget ?? this.options.ownerDocument.activeElement;
        this.transitionTo(resolveEventNode(target));
      });
    };
    options.ownerDocument.addEventListener("focusin", this.handleFocusIn, true);
    options.ownerDocument.addEventListener("focusout", this.handleFocusOut, true);
  }

  /** @returns Current focus owner. */
  get owner(): HtmlFocusOwner {
    return this.currentOwner;
  }

  /**
   * Classifies and applies one explicit focus target.
   *
   * @param target - Newly focused DOM node, or null when focus left the document.
   */
  transitionTo(target: Node | null): void {
    const nextOwner = classifyHtmlFocusOwner(this.options, target);
    if (nextOwner === this.currentOwner) {
      return;
    }
    this.currentOwner = nextOwner;
    this.options.onOwnerChange?.(nextOwner);
  }

  /** Restores canonical document input focus without mutating PM selection. */
  restoreDocumentFocus(): void {
    this.options.focusDocumentInput();
    this.transitionTo(this.options.inputProxy);
  }

  /** Removes document-level focus listeners. */
  destroy(): void {
    this.options.ownerDocument.removeEventListener("focusin", this.handleFocusIn, true);
    this.options.ownerDocument.removeEventListener("focusout", this.handleFocusOut, true);
  }
}

/**
 * Narrows a cross-realm EventTarget to a DOM node without the global Node constructor.
 *
 * @param target - Browser event target or active element candidate.
 * @returns DOM node candidate, or null.
 */
function resolveEventNode(target: EventTarget | null): Node | null {
  return target !== null && "nodeType" in target ? target as Node : null;
}

/**
 * Creates focus ownership for one retained HTML root.
 *
 * @param options - Mounted roots, input proxy, and transition observer.
 * @returns Focus ownership runtime.
 */
export function createHtmlFocusRuntime(
  options: CreateHtmlFocusRuntimeOptions
): HtmlFocusRuntime {
  return new DefaultHtmlFocusRuntime(options);
}

/**
 * Classifies focus from exact mounted ownership instead of broad tag-name rules.
 *
 * Scope identity wins before document ancestry so nested editors and preserving
 * toolbar controls cannot accidentally resume the document IME owner.
 *
 * @param options - Mounted roots and canonical input proxy.
 * @param target - Candidate focused node.
 * @returns Canonical focus owner.
 */
function classifyHtmlFocusOwner(
  options: CreateHtmlFocusRuntimeOptions,
  target: Node | null
): HtmlFocusOwner {
  if (target === null) {
    return "outside";
  }
  if (target === options.inputProxy || isDescendantOf(target, options.inputProxy)) {
    return "document";
  }
  const scope = findFocusScope(target);
  if (scope === "preserve-selection") {
    return "selection-preserving-ui";
  }
  if (scope === "nested-embed") {
    return "nested-embed";
  }
  if (target === options.documentRoot || isDescendantOf(target, options.documentRoot)) {
    return options.isNodeViewControl(target) ? "node-view-control" : "document";
  }
  if (target === options.documentSurface) {
    return "document";
  }
  return "outside";
}

/**
 * Finds the nearest internal focus scope.
 *
 * @param target - Focused node whose ancestors should be inspected.
 * @returns Declared focus scope, or undefined.
 */
function findFocusScope(target: Node): HtmlFocusScope | undefined {
  let current: Node | null = target;
  while (current !== null) {
    const dataset = (current as HTMLElement).dataset;
    const scope = dataset?.[focusScopeDatasetKey];
    if (scope === "preserve-selection" || scope === "nested-embed") {
      return scope;
    }
    current = current.parentNode;
  }
  return undefined;
}

/**
 * Checks ancestry without requiring browser-only `Node.contains` in unit fakes.
 *
 * @param target - Candidate descendant.
 * @param ancestor - Required ancestor.
 * @returns Whether the target belongs to the ancestor subtree.
 */
function isDescendantOf(target: Node, ancestor: Node): boolean {
  let current: Node | null = target.parentNode;
  while (current !== null) {
    if (current === ancestor) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}
