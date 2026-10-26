import type {
  QuireViewLayerPlane,
  QuireViewLayerPlaneDescriptor,
  QuireViewLayerStack,
  QuireViewLayerStackConsumerKind,
  QuireViewPointerPolicy
} from "../types";

const defaultSelectPointerPolicy = {
  kind: "select",
  shouldFocusEditor: true,
  shouldPreventDefault: true
} as const satisfies QuireViewPointerPolicy;

const defaultDispatchPointerPolicy = {
  kind: "dispatch",
  shouldFocusEditor: true,
  shouldPreventDefault: true
} as const satisfies QuireViewPointerPolicy;

const defaultPassThroughPointerPolicy = {
  kind: "pass-through",
  shouldFocusEditor: false,
  shouldPreventDefault: false
} as const satisfies QuireViewPointerPolicy;

const interactiveOnlyConsumers = [
  "interactive",
  "diagnostics"
] as const satisfies readonly QuireViewLayerStackConsumerKind[];

const documentConsumers = [
  "interactive",
  "print",
  "accessibility",
  "diagnostics"
] as const satisfies readonly QuireViewLayerStackConsumerKind[];

const visibleDocumentConsumers = [
  "interactive",
  "print",
  "diagnostics"
] as const satisfies readonly QuireViewLayerStackConsumerKind[];

const accessibleChromeConsumers = [
  "interactive",
  "accessibility",
  "diagnostics"
] as const satisfies readonly QuireViewLayerStackConsumerKind[];

/** Canonical editor-oriented layer stack shared by all mounted backends. */
export const quireViewEditorLayerStack = {
  planes: [
    createPlaneDescriptor({
      plane: "page-background",
      order: 0,
      defaultPointerPolicy: defaultPassThroughPointerPolicy,
      consumers: visibleDocumentConsumers
    }),
    createPlaneDescriptor({
      plane: "drawing-behind-content",
      order: 5,
      defaultPointerPolicy: defaultSelectPointerPolicy,
      consumers: documentConsumers
    }),
    createPlaneDescriptor({
      plane: "content",
      order: 10,
      defaultPointerPolicy: defaultSelectPointerPolicy,
      consumers: documentConsumers
    }),
    createPlaneDescriptor({
      plane: "page-chrome",
      order: 20,
      defaultPointerPolicy: defaultSelectPointerPolicy,
      consumers: documentConsumers
    }),
    createPlaneDescriptor({
      plane: "selection",
      order: 30,
      defaultPointerPolicy: defaultPassThroughPointerPolicy,
      consumers: interactiveOnlyConsumers
    }),
    createPlaneDescriptor({
      plane: "annotation",
      order: 40,
      defaultPointerPolicy: defaultSelectPointerPolicy,
      consumers: documentConsumers
    }),
    createPlaneDescriptor({
      plane: "drawing",
      order: 50,
      defaultPointerPolicy: defaultSelectPointerPolicy,
      consumers: documentConsumers
    }),
    createPlaneDescriptor({
      plane: "controls",
      order: 60,
      defaultPointerPolicy: defaultDispatchPointerPolicy,
      consumers: accessibleChromeConsumers
    }),
    createPlaneDescriptor({
      plane: "dom-proxy",
      order: 70,
      defaultPointerPolicy: defaultDispatchPointerPolicy,
      consumers: interactiveOnlyConsumers
    }),
    createPlaneDescriptor({
      plane: "floating-ui",
      order: 80,
      defaultPointerPolicy: defaultDispatchPointerPolicy,
      consumers: interactiveOnlyConsumers
    })
  ]
} as const satisfies QuireViewLayerStack;

/**
 * Lists editor layer plane descriptors in display order.
 *
 * @param consumer - Optional consumer mode used to filter planes.
 * @returns Canonical layer plane descriptors for the requested consumer.
 */
export function listQuireViewLayerStackPlaneDescriptors(
  consumer?: QuireViewLayerStackConsumerKind
): readonly QuireViewLayerPlaneDescriptor[] {
  if (consumer === undefined) {
    return quireViewEditorLayerStack.planes;
  }

  return quireViewEditorLayerStack.planes.filter((descriptor) =>
    descriptor.consumers.includes(consumer)
  );
}

/**
 * Resolves the canonical descriptor for one editor layer plane.
 *
 * @param plane - Plane to resolve.
 * @returns Descriptor owned by the editor layer stack.
 */
export function resolveQuireViewLayerPlaneDescriptor(
  plane: QuireViewLayerPlane
): QuireViewLayerPlaneDescriptor {
  const descriptor = quireViewEditorLayerStack.planes.find(
    (candidate) => candidate.plane === plane
  );

  if (descriptor === undefined) {
    throw new Error(`Unknown Quire view layer plane: ${plane}`);
  }

  return descriptor;
}

/**
 * Creates one canonical layer plane descriptor.
 *
 * @param options - Plane, order, policy, and consumer visibility.
 * @returns Layer plane descriptor with matching display and hit orders.
 */
function createPlaneDescriptor(options: {
  /** Visual plane represented by the descriptor. */
  readonly plane: QuireViewLayerPlane;
  /** Shared display and hit-test order for this first stack product. */
  readonly order: number;
  /** Default pointer policy for the plane. */
  readonly defaultPointerPolicy: QuireViewPointerPolicy;
  /** Consumers that should see this plane by default. */
  readonly consumers: readonly QuireViewLayerStackConsumerKind[];
}): QuireViewLayerPlaneDescriptor {
  return {
    plane: options.plane,
    displayOrder: options.order,
    hitTestOrder: options.order,
    defaultPointerPolicy: options.defaultPointerPolicy,
    consumers: options.consumers
  };
}
