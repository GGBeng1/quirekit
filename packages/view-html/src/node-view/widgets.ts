import type { Decoration } from "@quirekit/pm";
import type {
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import { HtmlWidgetDescriptorRuntime } from "../descriptors/widget";
import type {
  HtmlContainerDesc,
  HtmlDescriptorDiagnostic,
  HtmlWidgetDesc
} from "../descriptors/types";
import type { HtmlTargetDescriptor } from "../reconcile/types";
import type { HtmlKeyedWidgetFacts, HtmlNodeViewEnvironment } from "./types";

/** Inputs for creating one retained keyed widget descriptor. */
interface CreateHtmlWidgetDescriptorOptions {
  /** Stable document-owned descriptor id. */
  readonly id: string;
  /** Retained document parent. */
  readonly parent: HtmlContainerDesc;
  /** Inherited parent source identity. */
  readonly source: QuireLayoutSourceRef;
  /** Validated keyed widget facts. */
  readonly facts: HtmlKeyedWidgetFacts;
  /** Mounted view environment passed to widget factories. */
  readonly environment: HtmlNodeViewEnvironment;
  /** Mutable retained diagnostic sink. */
  readonly diagnostics: HtmlDescriptorDiagnostic[];
}

/**
 * Creates one retained keyed widget descriptor from a widget target.
 *
 * @param parent - Retained parent that owns the widget boundary.
 * @param target - Valid keyed widget target.
 * @param environment - Exact mounted view environment.
 * @param id - Monotonic descriptor id.
 * @param diagnostics - Mutable retained diagnostic sink.
 * @returns Retained widget descriptor, mountless for invalid factory output.
 */
export function createHtmlWidgetTargetDescriptor(
  parent: HtmlContainerDesc,
  target: HtmlTargetDescriptor,
  environment: HtmlNodeViewEnvironment,
  id: string,
  diagnostics: HtmlDescriptorDiagnostic[]
): HtmlWidgetDesc {
  return createHtmlWidgetDescriptor({
    id,
    parent,
    source: target.source,
    facts: {
      key: target.widgetKey!,
      position: target.range.from,
      side: target.widgetSide ?? 0,
      decoration: target.widgetDecoration!
    },
    environment,
    diagnostics
  });
}

/**
 * Creates one keyed widget descriptor and invokes its DOM factory once.
 *
 * @param options - Validated widget facts and retained ownership inputs.
 * @returns Retained widget descriptor.
 */
function createHtmlWidgetDescriptor(
  options: CreateHtmlWidgetDescriptorOptions
): HtmlWidgetDesc {
  let descriptor: HtmlWidgetDescriptorRuntime | null = null;
  const renderer = readWidgetRenderer(options.facts.decoration);
  const candidate: unknown = typeof renderer === "function"
    ? renderer(options.environment.view, () => descriptor
      ? descriptor.destroyed || descriptor.dirtyState === "invalid"
        ? undefined
        : descriptor.range.from
      : options.facts.position)
    : renderer;
  const dom = isDomNode(candidate) && candidate !== options.environment.view.dom
    ? candidate
    : null;

  if (!dom) {
    options.diagnostics.push({
      code: "html-widget-dom-invalid",
      descriptorId: options.id,
      typeName: "widget",
      message: `Keyed widget "${options.facts.key}" must return its own DOM node.`
    });
  }
  descriptor = new HtmlWidgetDescriptorRuntime({
    id: options.id,
    parent: options.parent,
    source: options.source,
    range: { from: options.facts.position, to: options.facts.position },
    key: options.facts.key,
    decoration: options.facts.decoration,
    side: options.facts.side,
    mount: dom ? { dom, contentDOM: null } : null
  });
  return descriptor;
}

/**
 * Reads the untrusted widget renderer field from PM decoration internals.
 *
 * @param decoration - Valid widget decoration.
 * @returns DOM node, DOM factory, or undefined for invalid structure.
 */
function readWidgetRenderer(
  decoration: Decoration
): Node | ((view: HtmlNodeViewEnvironment["view"], getPos: () => number | undefined) => unknown) | undefined {
  const type = readRecord(decoration.type);
  const renderer = type?.toDOM;

  return typeof renderer === "function" || isDomNode(renderer)
    ? renderer as Node | ((
        view: HtmlNodeViewEnvironment["view"],
        getPos: () => number | undefined
      ) => unknown)
    : undefined;
}

/**
 * Narrows untrusted PM internals to a property record.
 *
 * @param value - Runtime value to inspect.
 * @returns Property record, or null.
 */
function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : null;
}

/**
 * Narrows browser or fake-DOM output to the DOM node contract.
 *
 * @param value - Widget factory output to inspect.
 * @returns Whether the value is a DOM-like node.
 */
function isDomNode(value: unknown): value is Node {
  return readRecord(value) !== null && typeof readRecord(value)?.nodeType === "number";
}
