import { appendMountedHtmlDescriptor } from "./mount-tree";
import {
  HtmlMarkDescriptorRuntime,
  HtmlTextDescriptorRuntime
} from "./runtime";
import { createHtmlSchemaMarkMount } from "./schema";
import { createHtmlMarkViewHost } from "../node-view/host";
import { HtmlInlineDecorationRuntime } from "./inline";
import type {
  CreateHtmlTextDescriptorOptions,
  HtmlContainerDesc,
  HtmlMarkDesc,
  HtmlTextDesc
} from "./types";
import type { HtmlInlineDecorationDesc } from "./types";

/**
 * Creates a direct text owner or the outer descriptor of its mark chain.
 *
 * @param options - Text node, ownership, range, and DOM creation inputs.
 * @returns Direct text descriptor or outer retained mark descriptor.
 */
export function createHtmlTextOrMarkDescriptor(
  options: CreateHtmlTextDescriptorOptions
): HtmlTextDesc | HtmlMarkDesc | HtmlInlineDecorationDesc {
  if (options.inlineAttrs) {
    const wrapper = new HtmlInlineDecorationRuntime(options);
    const child = createMarkedTextLevel({ ...options, id: options.allocateId?.() ?? `${options.id}:content` }, 0, wrapper);
    wrapper.adoptChildren([child]);
    appendMountedHtmlDescriptor(wrapper.mount!.contentDOM, child);
    return wrapper;
  }
  return createMarkedTextLevel(options, options.markIndex ?? 0, options.parent);
}

/**
 * Recursively creates mark wrappers until the direct text owner is reached.
 *
 * @param options - Text node and retained ownership inputs.
 * @param markIndex - Mark index currently being realized.
 * @param parent - Retained parent for the current level.
 * @returns Current mark wrapper or final direct text descriptor.
 */
function createMarkedTextLevel(
  options: CreateHtmlTextDescriptorOptions,
  markIndex: number,
  parent: HtmlContainerDesc
): HtmlTextDesc | HtmlMarkDesc {
  const mark = options.node.marks[markIndex];

  if (!mark) {
    return new HtmlTextDescriptorRuntime({
      id: markIndex === 0
        ? options.allocateId ? options.id : `${options.id}:text`
        : options.allocateId?.() ?? `${options.id}:text`,
      node: options.node,
      parent,
      source: options.source,
      range: options.range,
      mount: {
        dom: options.ownerDocument.createTextNode(options.node.text ?? ""),
        contentDOM: null
      }
    });
  }

  const id = options.allocateId
    ? markIndex === 0 ? options.id : options.allocateId()
    : `${options.id}:mark:${markIndex}:${mark.type.name}`;
  const factory = options.nodeViewEnvironment?.markViews[mark.type.name];
  const host = factory
    ? createHtmlMarkViewHost({
        descriptorId: id,
        mark,
        view: options.nodeViewEnvironment!.view,
        inline: true,
        factory,
        diagnostics: options.diagnostics
      })
    : null;
  const descriptor = new HtmlMarkDescriptorRuntime({
    id,
    mark,
    parent,
    source: options.source,
    range: options.range,
    factory: factory ?? null,
    host,
    mount: factory
      ? host ? { dom: host.dom, contentDOM: host.contentDOM } : null
      : createHtmlSchemaMarkMount(
          id,
          mark,
          options.ownerDocument,
          options.diagnostics
        )
  });

  if (factory && !host?.contentDOM) {
    return descriptor;
  }
  const child = createMarkedTextLevel(options, markIndex + 1, descriptor);

  descriptor.mutableChildren.push(child);
  appendMountedHtmlDescriptor(descriptor.mount?.contentDOM ?? null, child);
  return descriptor;
}
