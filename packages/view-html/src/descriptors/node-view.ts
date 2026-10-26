import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import { HtmlContainerDescriptorRuntime } from "./lifecycle";
import { resolveHtmlNodeViewDecorations } from "../node-view/decorations";
import { createHtmlNodeViewHost } from "../node-view/host";
import type {
  CreateHtmlNodeDescriptorOptions,
  HtmlDescriptorDiagnostic,
  HtmlNodeViewDesc,
  HtmlNodeViewDescriptorRuntimeOptions,
  MutableHtmlContainerDescriptor
} from "./types";
import type { HtmlNodeViewEnvironment } from "../node-view/types";

/** Runtime implementation of a retained custom NodeView descriptor. */
export class HtmlNodeViewDescriptorRuntime
  extends HtmlContainerDescriptorRuntime
  implements HtmlNodeViewDesc {
  /** @inheritdoc */
  readonly kind = "node-view" as const;
  /** @inheritdoc */
  node: ProseMirrorNode;
  /** @inheritdoc */
  readonly factory: HtmlNodeViewDesc["factory"];
  /** @inheritdoc */
  readonly host: HtmlNodeViewDesc["host"];

  /**
   * Creates a retained descriptor for one exact custom node factory.
   *
   * @param options - Node, factory, host, and shared lifecycle inputs.
   */
  constructor(options: HtmlNodeViewDescriptorRuntimeOptions) {
    super(options);
    this.node = options.node;
    this.factory = options.factory;
    this.host = options.host;
  }

  /** @inheritdoc */
  updateNode(node: ProseMirrorNode, range: QuireDocumentRange): void {
    if (node.isText || !this.host?.canRepresent(node)) {
      throw new RangeError("HtmlNodeViewDesc.updateNode requires host-compatible node semantics.");
    }
    this.node = node;
    this.range = range;
  }

  /** @inheritdoc */
  override destroy(): void {
    if (this.destroyed) {
      return;
    }
    super.destroy();
    this.host?.destroy();
  }
}

/**
 * Creates one exact-factory NodeView descriptor without schema fallback.
 *
 * @param options - Canonical node, ownership, and DOM creation inputs.
 * @param factory - Exact node-type factory selected from the environment.
 * @param diagnostics - Mutable diagnostic output for the construction request.
 * @param createChildren - Child creator invoked only for an exposed content DOM.
 * @returns Retained NodeView descriptor, mounted only for valid factory output.
 */
export function createHtmlCustomNodeViewDescriptor(
  options: CreateHtmlNodeDescriptorOptions,
  factory: NonNullable<HtmlNodeViewEnvironment["nodeViews"][string]>,
  diagnostics: HtmlDescriptorDiagnostic[],
  createChildren: (descriptor: MutableHtmlContainerDescriptor) => void
): HtmlNodeViewDescriptorRuntime {
  let descriptor: HtmlNodeViewDescriptorRuntime | null = null;
  const decorationState = resolveHtmlNodeViewDecorations(
    options.nodeViewEnvironment,
    options.parent,
    options.node,
    options.range
  );
  const host = createHtmlNodeViewHost({
    descriptorId: options.id,
    node: options.node,
    view: options.nodeViewEnvironment!.view,
    getPos: () => descriptor
      ? descriptor.destroyed || descriptor.dirtyState === "invalid"
        ? undefined
        : descriptor.range.from
      : options.range.from,
    decorations: decorationState.decorations,
    innerDecorations: decorationState.innerDecorations,
    factory,
    diagnostics
  });

  descriptor = new HtmlNodeViewDescriptorRuntime({
    id: options.id,
    node: options.node,
    parent: options.parent,
    source: options.source,
    range: options.range,
    factory,
    host,
    mount: host ? { dom: host.dom, contentDOM: host.contentDOM } : null
  });
  if (host?.contentDOM) {
    createChildren(descriptor);
  }
  return descriptor;
}
