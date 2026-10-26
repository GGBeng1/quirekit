import type { QuireViewMutationRecord } from "@quirekit/core";
import {
  routeHtmlMarkViewMutation,
  routeHtmlNodeViewEvent,
  routeHtmlNodeViewMutation
} from "./events";
import type {
  CreateHtmlMarkViewHostOptions,
  CreateHtmlNodeViewHostOptions,
  HtmlMarkViewHost,
  HtmlMarkViewInstance,
  HtmlNodeViewHost,
  HtmlNodeViewInstance,
  HtmlNodeViewUpdate,
  HtmlValidatedViewMount
} from "./types";
import { validateHtmlViewMount } from "./mount";

/**
 * Creates one validated framework-neutral node view host.
 *
 * @param options - Exact factory, canonical inputs, and diagnostic sink.
 * @returns Valid host, or null when the exact factory output is invalid.
 */
export function createHtmlNodeViewHost(
  options: CreateHtmlNodeViewHostOptions
): HtmlNodeViewHost | null {
  const candidate: unknown = options.factory(
    options.node,
    options.view,
    options.getPos,
    options.decorations,
    options.innerDecorations
  );
  const mount = validateHostMount(options, candidate, "node", options.node.type.name);
  if (!mount) return null;
  const instance = candidate as HtmlNodeViewInstance;

  return new HtmlNodeViewHostRuntime(
    options.factory,
    instance,
    mount.dom,
    mount.contentDOM,
    options.node
  );
}

/**
 * Creates one validated framework-neutral mark view host.
 *
 * @param options - Exact factory, canonical inputs, and diagnostic sink.
 * @returns Valid host, or null when the exact factory output is invalid.
 */
export function createHtmlMarkViewHost(
  options: CreateHtmlMarkViewHostOptions
): HtmlMarkViewHost | null {
  const candidate: unknown = options.factory(options.mark, options.view, options.inline);
  const mount = validateHostMount(options, candidate, "mark", options.mark.type.name);
  if (!mount) return null;
  const instance = candidate as HtmlMarkViewInstance;
  let destroyed = false;
  return {
    factory: options.factory, instance, dom: mount.dom,
    contentDOM: mount.contentDOM ?? mount.dom,
    /** @inheritdoc */
    ignoreMutation(record) { return !destroyed && routeHtmlMarkViewMutation(instance, record); },
    /** @inheritdoc */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      instance.destroy?.();
    }
  };
}

/**
 * Applies one factory-output validation contract to nodes and marks.
 * @param options - Mounted owner and diagnostic sink.
 * @param candidate - Untrusted exact factory result.
 * @param kind - Node or mark diagnostic family.
 * @param typeName - Canonical schema type name.
 * @returns Owned DOM boundaries, or null with the original precise diagnostic.
 */
function validateHostMount(
  options: CreateHtmlNodeViewHostOptions | CreateHtmlMarkViewHostOptions,
  candidate: unknown,
  kind: "node" | "mark",
  typeName: string
): HtmlValidatedViewMount | null {
  const mount = validateHtmlViewMount(candidate, options.view.dom);
  if (mount?.contentValid) return mount;
  const label = kind === "node" ? "Node" : "Mark";
  options.diagnostics.push({
    code: mount ? `html-${kind}-view-content-dom-invalid` : `html-${kind}-view-dom-invalid`,
    descriptorId: options.descriptorId, typeName,
    message: mount
      ? `${label} view "${typeName}" returned contentDOM outside its DOM.`
      : `${label} view "${typeName}" must return its own DOM element.`
  });
  return null;
}

/** Canonical runtime implementation for one retained node view instance. */
class HtmlNodeViewHostRuntime implements HtmlNodeViewHost {
  private destroyed = false;

  /**
   * Creates a validated retained node view host.
   *
   * @param factory - Exact extension factory.
   * @param instance - Stable factory result.
   * @param dom - Validated factory-owned root DOM.
   * @param contentDOM - Validated editable boundary.
   * @param node - Initial node represented by this host.
   */
  constructor(
    readonly factory: HtmlNodeViewHost["factory"],
    readonly instance: HtmlNodeViewInstance,
    readonly dom: HTMLElement,
    readonly contentDOM: HTMLElement | null,
    private node: HtmlNodeViewUpdate["node"]
  ) {}

  /** @inheritdoc */
  canRepresent(node: HtmlNodeViewUpdate["node"]): boolean {
    return !this.destroyed && (
      node.type === this.node.type || this.instance.multiType === true
    );
  }

  /** @inheritdoc */
  update(input: HtmlNodeViewUpdate): boolean {
    if (!this.canRepresent(input.node)) {
      return false;
    }
    const retained = this.instance.update
      ? this.instance.update(input.node, input.decorations, input.innerDecorations) === true
      : input.node.sameMarkup(this.node) && (
          this.contentDOM !== null || input.node.isLeaf
        );

    if (retained) {
      this.node = input.node;
    }
    return retained;
  }

  /** @inheritdoc */
  stopEvent(event: Event): boolean {
    return !this.destroyed && routeHtmlNodeViewEvent(this.instance, event);
  }

  /** @inheritdoc */
  ignoreMutation(record: QuireViewMutationRecord): boolean {
    return !this.destroyed && routeHtmlNodeViewMutation(this.instance, record);
  }

  /** @inheritdoc */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.instance.destroy?.();
  }
}
