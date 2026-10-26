import type { Node as ProseMirrorNode } from "@quirekit/pm";
import { appendMountedHtmlDescriptor } from "./mount-tree";
import {
  HtmlDocumentDescriptorRuntime,
  HtmlNodeDescriptorRuntime
} from "./runtime";
import {
  createHtmlCustomNodeViewDescriptor,
  HtmlNodeViewDescriptorRuntime
} from "./node-view";
import {
  createHtmlNodeContentHoleDiagnostic,
  createHtmlSchemaNodeMount
} from "./schema";
import { createHtmlTextOrMarkDescriptor } from "./text";
import type { HtmlDocumentDescriptorCreationResult } from "../document/types";
import { applyHtmlDescriptorDecorationAttributes } from "../node-view/attributes";
import { createHtmlDecoratedChildren } from "../node-view/children";
import { createHtmlWidgetTargetDescriptor } from "../node-view/widgets";
import type { HtmlNodeViewEnvironment } from "../node-view/types";
import type {
  CreateHtmlDocumentDescriptorOptions,
  CreateHtmlNodeDescriptorOptions,
  HtmlDescriptorCreationResult,
  HtmlDescriptorDiagnostic,
  HtmlNodeDesc,
  HtmlNodeViewDesc,
  MutableHtmlContainerDescriptor
} from "./types";

/**
 * Creates the runtime-owned root and retained descendants for one document.
 *
 * @param options - Document node, browser document, identity, and source inputs.
 * @returns Retained document descriptor and explicit schema diagnostics.
 */
export function createHtmlDocumentDescriptor(
  options: CreateHtmlDocumentDescriptorOptions
): HtmlDocumentDescriptorCreationResult {
  const diagnostics: HtmlDescriptorDiagnostic[] = [];
  const root = options.ownerDocument.createElement("div");
  const descriptor = new HtmlDocumentDescriptorRuntime({
    id: options.id,
    node: options.documentNode,
    source: options.source,
    range: { from: 0, to: options.documentNode.content.size },
    mount: { dom: root, contentDOM: root }
  });

  root.className = "qk-html-editor__document";
  createNodeChildren({
    ...options,
    descriptor,
    node: options.documentNode,
    diagnostics
  });
  applyHtmlDescriptorDecorationAttributes(descriptor, options.nodeViewEnvironment);

  return { descriptor, diagnostics };
}

/**
 * Creates one retained descriptor subtree from a non-text schema node.
 *
 * @param options - Schema node, owner, source, range, and browser document inputs.
 * @returns Retained node descriptor and explicit schema diagnostics.
 */
export function createHtmlNodeDescriptor(
  options: CreateHtmlNodeDescriptorOptions
): HtmlDescriptorCreationResult<HtmlNodeDesc | HtmlNodeViewDesc> {
  if (options.node.isText) {
    throw new RangeError("createHtmlNodeDescriptor requires a non-text node.");
  }

  const diagnostics: HtmlDescriptorDiagnostic[] = [];
  const descriptor = createNodeDescriptor({ ...options, diagnostics });

  return { descriptor, diagnostics };
}

/** Internal inputs used while recursively creating one schema node. */
interface CreateNodeDescriptorInternalOptions extends CreateHtmlNodeDescriptorOptions {
  /** Mutable diagnostic output for the complete construction request. */
  readonly diagnostics: HtmlDescriptorDiagnostic[];
}

/** Internal inputs used while creating ordered node children. */
interface CreateNodeChildrenOptions {
  /** Parent descriptor receiving the retained children. */
  readonly descriptor: MutableHtmlContainerDescriptor;
  /** ProseMirror node whose content is traversed. */
  readonly node: ProseMirrorNode;
  /** Browser document used to create DOM products. */
  readonly ownerDocument: Document;
  /** Mutable diagnostic output for the complete construction request. */
  readonly diagnostics: HtmlDescriptorDiagnostic[];
  /** Optional document-owned descendant id allocator. */
  readonly allocateId?: (() => string) | undefined;
  /** Optional resolver for explicit child source identities. */
  readonly resolveSource?: CreateHtmlDocumentDescriptorOptions["resolveSource"];
  /** Optional exact node/mark factory environment. */
  readonly nodeViewEnvironment?: HtmlNodeViewEnvironment | undefined;
}

/**
 * Creates one non-text node descriptor and its child descriptors.
 *
 * @param options - Internal schema-node construction inputs.
 * @returns Retained node descriptor for the complete subtree.
 */
function createNodeDescriptor(
  options: CreateNodeDescriptorInternalOptions
): HtmlNodeDescriptorRuntime | HtmlNodeViewDescriptorRuntime {
  const factory = options.nodeViewEnvironment?.nodeViews[options.node.type.name];
  /** @param descriptor - Schema or factory owner receiving the same canonical children. */
  const createChildren = (descriptor: MutableHtmlContainerDescriptor): void => {
    createNodeChildren({ ...options, descriptor });
  };

  if (factory) {
    return createHtmlCustomNodeViewDescriptor(
      options,
      factory,
      options.diagnostics,
      createChildren
    );
  }
  const descriptor = new HtmlNodeDescriptorRuntime({
    ...options,
    mount: createHtmlSchemaNodeMount(
      options.id,
      options.node,
      options.ownerDocument,
      options.diagnostics
    )
  });

  createChildren(descriptor);

  const contentHoleDiagnostic = createHtmlNodeContentHoleDiagnostic(descriptor);

  if (contentHoleDiagnostic) {
    options.diagnostics.push(contentHoleDiagnostic);
    if (contentHoleDiagnostic.code === "html-node-content-hole-invalid") {
      descriptor.detachMount();
    }
  }

  return descriptor;
}

/**
 * Creates retained children and attaches their mounted products when possible.
 *
 * @param options - Parent descriptor, source node, and browser construction state.
 */
function createNodeChildren(options: CreateNodeChildrenOptions): void {
  const children = createHtmlDecoratedChildren(
    options.descriptor,
    options.node,
    options.nodeViewEnvironment
  );

  children.forEach((product, index) => {
    const id = options.allocateId?.() ?? `${options.descriptor.id}:child:${index}`;
    if (product.kind === "widget") {
      if (!options.nodeViewEnvironment) {
        throw new RangeError("Decorated HTML widget creation requires an environment.");
      }
      const descriptor = createHtmlWidgetTargetDescriptor(
        options.descriptor,
        {
          kind: "widget",
          node: options.node,
          range: product.range,
          source: options.descriptor.source,
          widgetDecoration: product.widget!.decoration,
          widgetKey: product.widget!.key,
          widgetSide: product.widget!.side
        },
        options.nodeViewEnvironment,
        id,
        options.diagnostics
      );

      options.descriptor.mutableChildren.push(descriptor);
      appendMountedHtmlDescriptor(options.descriptor.mount?.contentDOM ?? null, descriptor);
      return;
    }
    const child = product.node!;
    const source = options.resolveSource?.(child, options.descriptor.source) ??
      options.descriptor.source;
    const childOptions = {
      ...options, id, node: child, parent: options.descriptor,
      source, range: product.range
    };
    const descriptor = child.isText
      ? createHtmlTextOrMarkDescriptor({ ...childOptions, inlineAttrs: product.inlineAttrs })
      : createNodeDescriptor(childOptions);

    options.descriptor.mutableChildren.push(descriptor);
    appendMountedHtmlDescriptor(
      options.descriptor.mount?.contentDOM ?? null,
      descriptor
    );
  });
}
