import type { Decoration, DecorationAttrs } from "@quirekit/pm";
import type { HtmlDescriptor, HtmlDocumentDesc } from "../descriptors";
import type { MutableHtmlReconcileTrace } from "../reconcile/types";
import { walkHtmlDescriptors } from "../reconcile/ownership/descriptor-tree";
import type { HtmlNodeViewEnvironment } from "./types";

/** Baseline attributes restored before each retained decoration pass. */
const decorationBaselines = new WeakMap<Element, Map<string, string | null>>();

/**
 * Restores every direct decoration attribute previously applied in a subtree.
 *
 * @param root - Retained document whose schema-owned attributes become authoritative.
 */
export function clearHtmlDescriptorDecorationAttributes(
  root: HtmlDocumentDesc,
  trace?: MutableHtmlReconcileTrace
): void {
  walkHtmlDescriptors(root, (descriptor) => {
    const element = descriptor.mount?.dom.nodeType === 1
      ? descriptor.mount.dom as Element
      : null;
    const baseline = element ? decorationBaselines.get(element) : undefined;

    if (!element || !baseline) {
      return;
    }
    for (const [name, value] of baseline) {
      if (value === null) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, value);
      }
      traceDecorationWrite(trace, descriptor, name, value);
    }
    decorationBaselines.delete(element);
  });
}

/**
 * Applies current node decorations to retained schema shells.
 *
 * @param root - Retained document whose represented descriptors are decorated.
 * @param environment - Optional live decoration source environment.
 */
export function applyHtmlDescriptorDecorationAttributes(
  root: HtmlDocumentDesc,
  environment: HtmlNodeViewEnvironment | undefined,
  trace?: MutableHtmlReconcileTrace
): void {
  if (!environment) {
    return;
  }
  const descriptors: HtmlDescriptor[] = [];
  const decorations: Decoration[] = [];

  walkHtmlDescriptors(root, (descriptor) => descriptors.push(descriptor));
  environment.getDecorations().forEachSet((set) => {
    decorations.push(...set.find());
  });

  // Inline spans have their own retained wrappers. This pass only decorates
  // exact outer node ranges and never mutates canonical mark attributes.
  for (const decoration of decorations) {
    const attrs = readDecorationAttrs(decoration);

    if (!attrs) {
      continue;
    }
    if (!decoration.inline && !decoration.widget) {
      const descriptor = descriptors.find((candidate) => (
        (candidate.kind === "node" || candidate.kind === "node-view") &&
        candidate.range.from === decoration.from &&
        candidate.range.to === decoration.to
      ));

      applyDecorationAttrs(descriptor, attrs, trace);
    } else if (decoration.inline) {
      const descriptor = descriptors.find(candidate => candidate.kind === "mark"
        && (candidate.parent?.kind === "node" || candidate.parent?.kind === "node-view")
        && candidate.range.from === decoration.from && candidate.range.to === decoration.to);
      applyDecorationAttrs(descriptor, attrs, trace);
    }
  }
}

/**
 * Validates the attribute-bearing decoration type contract.
 *
 * @param decoration - Node or inline decoration to inspect.
 * @returns Explicit string-valued attributes, or null for invalid structure.
 */
function readDecorationAttrs(decoration: Decoration): DecorationAttrs | null {
  const type: unknown = decoration.type;

  if (!isRecord(type) || !isRecord(type.attrs)) {
    return null;
  }
  for (const value of Object.values(type.attrs)) {
    if (value !== undefined && typeof value !== "string") {
      return null;
    }
  }
  return type.attrs as DecorationAttrs;
}

/**
 * Narrows one runtime value to a structural property record.
 *
 * @param value - Runtime value to inspect.
 * @returns Whether property inspection is safe.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Applies additive decoration attributes while recording exact baselines.
 *
 * @param descriptor - Exact retained shell owner, when represented.
 * @param attrs - ProseMirror decoration attributes to apply.
 */
function applyDecorationAttrs(
  descriptor: HtmlDescriptor | undefined,
  attrs: DecorationAttrs,
  trace?: MutableHtmlReconcileTrace
): void {
  const element = descriptor?.mount?.dom.nodeType === 1
    ? descriptor.mount.dom as Element
    : null;

  if (!element || !descriptor) {
    return;
  }
  for (const [name, value] of Object.entries(attrs)) {
    if (name === "nodeName" || value === undefined) {
      continue;
    }
    const baseline = decorationBaselines.get(element) ?? new Map<string, string | null>();

    if (!baseline.has(name)) {
      baseline.set(name, element.getAttribute(name));
      decorationBaselines.set(element, baseline);
    }
    if (name === "class") {
      const current = element.getAttribute(name);
      element.setAttribute(name, current ? `${current} ${value}` : value);
    } else if (name === "style") {
      const current = element.getAttribute(name);
      const prefix = current?.replace(/;\s*$/, "");

      element.setAttribute(name, prefix ? `${prefix}; ${value}` : value);
    } else {
      element.setAttribute(name, value);
    }
    traceDecorationWrite(trace, descriptor, name, value);
  }
}

/** Records one decoration-owned attribute write at its exact call site. */
function traceDecorationWrite(
  trace: MutableHtmlReconcileTrace | undefined,
  descriptor: HtmlDescriptor,
  name: string,
  value: string | null
): void {
  if (!trace) {
    return;
  }
  trace.decorationWrites += 1;
  trace.attributeWrites.push({ descriptorId: descriptor.id, name, value });
}
