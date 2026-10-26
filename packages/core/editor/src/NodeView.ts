import { NodeSelection, type Node as PMNode } from "@quirekit/pm";
import type { QuireEditor } from "./Editor";
import type {
  CommandProps,
  QuireNodeViewRendererOptions,
  QuireNodeViewRendererProps,
  QuireViewMutationRecord
} from "./types";
import { isAndroid, isiOS } from "./utilities";

/** HTML element tag names whose events should stay inside a node view. */
const interactiveTagNames = new Set(["INPUT", "BUTTON", "SELECT", "TEXTAREA"]);

/** Default options used by the base node view implementation. */
const defaultNodeViewOptions = {
  stopEvent: null,
  ignoreMutation: null
};

/**
 * Base Tiptap-compatible node view for QuireKit mounted views.
 *
 * The class keeps Tiptap's public node-view shape while using
 * `QuireMountedEditorView` instead of binding core back to ProseMirror's DOM
 * EditorView implementation.
 */
export class NodeView<
  Component,
  NodeEditor extends QuireEditor = QuireEditor,
  Options extends QuireNodeViewRendererOptions = QuireNodeViewRendererOptions
> {
  /** Framework component or renderer object owned by this node view. */
  component: Component;

  /** Editor instance that owns the mounted view. */
  editor: NodeEditor;

  /** Node view options supplied by a framework renderer. */
  options: Options;

  /** Extension that created this node view. */
  extension: QuireNodeViewRendererProps["extension"];

  /** ProseMirror node represented by this node view. */
  node: QuireNodeViewRendererProps["node"];

  /** Decorations active on the node. */
  decorations: QuireNodeViewRendererProps["decorations"];

  /** Decorations active inside node content. */
  innerDecorations: QuireNodeViewRendererProps["innerDecorations"];

  /** Mounted view that owns this node view. */
  view: QuireNodeViewRendererProps["view"];

  /** Position resolver for the node represented by this view. */
  getPos: QuireNodeViewRendererProps["getPos"];

  /** Rendered attributes resolved from extension attributes. */
  HTMLAttributes: QuireNodeViewRendererProps["HTMLAttributes"];

  /** Whether this node view has started a drag interaction. */
  isDragging = false;

  /**
   * Creates a node view instance.
   *
   * @param component - Framework component or renderer object.
   * @param props - Node view renderer props supplied by the mounted view.
   * @param options - Optional node view behavior overrides.
   */
  constructor(
    component: Component,
    props: QuireNodeViewRendererProps,
    options?: Partial<Options>
  ) {
    this.component = component;
    this.editor = props.editor as NodeEditor;
    this.options = {
      ...defaultNodeViewOptions,
      ...options
    } as Options;
    this.extension = props.extension;
    this.node = props.node;
    this.decorations = props.decorations;
    this.innerDecorations = props.innerDecorations;
    this.view = props.view;
    this.getPos = props.getPos;
    this.HTMLAttributes = props.HTMLAttributes;
    this.mount();
  }

  /**
   * Mounts framework-specific resources.
   */
  mount(): void {}

  /**
   * Returns the DOM element exposed to ProseMirror-style integrations.
   *
   * @returns Root DOM element for this node view.
   */
  get dom(): HTMLElement {
    throw new RangeError("Concrete NodeView renderers must provide their own dom.");
  }

  /**
   * Returns the editable content DOM element, when this node view owns one.
   *
   * @returns Content DOM element or null for leaf views.
   */
  get contentDOM(): HTMLElement | null {
    return null;
  }

  /**
   * Starts dragging the represented node when a drag handle is used.
   *
   * @param event - Native drag event.
   */
  onDragStart(event: DragEvent): void {
    const target = event.target;
    const targetElement = getElement(target);
    const dragHandle = targetElement?.closest("[data-drag-handle]");

    if (!targetElement || !dragHandle || this.contentDOM?.contains(targetElement)) {
      return;
    }

    const dragImage = this.createDragImage(dragHandle, event);
    if (dragImage) {
      event.dataTransfer?.setDragImage(dragImage.element, dragImage.x, dragImage.y);
      scheduleDragImageCleanup(dragImage.wrapper);
    }

    const pos = this.getPos();
    if (typeof pos !== "number") {
      return;
    }

    this.view.dispatch(
      this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, pos))
    );
  }

  /**
   * Reports whether a DOM event should stay inside the node view.
   *
   * @param event - DOM event to test.
   * @returns Whether the mounted editor view should ignore the event.
   */
  stopEvent(event: Event): boolean {
    if (typeof this.options.stopEvent === "function") {
      return this.options.stopEvent({ event });
    }

    const targetElement = getElement(event.target);
    if (!targetElement || !this.dom.contains(targetElement)) {
      return false;
    }

    if (this.contentDOM?.contains(targetElement)) {
      return false;
    }

    const isDragEvent = event.type.startsWith("drag");
    const isDropEvent = event.type === "drop";
    const isClipboardEvent =
      event.type === "copy" || event.type === "cut" || event.type === "paste";
    const isMouseDown = event.type === "mousedown";
    const isSelectable = NodeSelection.isSelectable(this.node);

    if (isInteractiveTarget(targetElement) && !isDropEvent && !isDragEvent) {
      return true;
    }

    this.trackDraggingState(event, targetElement);

    if (
      this.isDragging ||
      isDropEvent ||
      isClipboardEvent ||
      (isMouseDown && isSelectable)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Reports whether a DOM mutation can be ignored by the mounted view.
   *
   * @param mutation - DOM mutation or selection mutation to test.
   * @returns Whether the mutation can be ignored.
   */
  ignoreMutation(mutation: QuireViewMutationRecord): boolean {
    if (typeof this.options.ignoreMutation === "function") {
      return this.options.ignoreMutation({ mutation });
    }

    if (!this.contentDOM || this.node.isLeaf || this.node.isAtom) {
      return true;
    }

    if (mutation.type === "selection") {
      return false;
    }

    if (
      this.dom.contains(mutation.target) &&
      mutation.type === "childList" &&
      (isiOS() || isAndroid()) &&
      this.editor.isFocused &&
      [...mutation.addedNodes, ...mutation.removedNodes].every(isEditableNode)
    ) {
      return false;
    }

    if (this.contentDOM === mutation.target && mutation.type === "attributes") {
      return true;
    }

    if (this.contentDOM.contains(mutation.target)) {
      return false;
    }

    return true;
  }

  /**
   * Updates attributes of the represented node.
   *
   * @param attributes - Partial attributes to merge into the node.
   */
  updateAttributes(attributes: Record<string, unknown>): void {
    this.editor.commands.command(({ tr }: CommandProps) => {
      const pos = this.getPos();

      if (typeof pos !== "number") {
        return false;
      }

      tr.setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        ...attributes
      });

      return true;
    });
  }

  /**
   * Deletes the represented node from the editor document.
   */
  deleteNode(): void {
    const from = this.getPos();

    if (typeof from !== "number") {
      return;
    }

    this.editor.commands.deleteRange({
      from,
      to: from + this.node.nodeSize
    });
  }

  /**
   * Creates a drag image that browsers can use during native drag and drop.
   *
   * @param dragHandle - Element that initiated the drag.
   * @param event - Native drag event.
   * @returns Drag image descriptor or null when the image cannot be created.
   */
  private createDragImage(
    dragHandle: Element,
    event: DragEvent
  ): { element: HTMLElement; wrapper: HTMLElement; x: number; y: number } | null {
    if (!this.dom.ownerDocument?.body) {
      return null;
    }

    const clonedNode = this.dom.cloneNode(true) as HTMLElement;
    const wrapper = this.dom.ownerDocument.createElement("div");
    const domBox = this.dom.getBoundingClientRect();
    const handleBox = dragHandle.getBoundingClientRect();
    const x = this.dom === dragHandle
      ? 0
      : handleBox.x - domBox.x + event.offsetX;
    const y = this.dom === dragHandle
      ? 0
      : handleBox.y - domBox.y + event.offsetY;

    clonedNode.style.width = `${Math.round(domBox.width)}px`;
    clonedNode.style.height = `${Math.round(domBox.height)}px`;
    clonedNode.style.boxSizing = "border-box";
    clonedNode.style.pointerEvents = "none";

    wrapper.style.position = "absolute";
    wrapper.style.top = "-9999px";
    wrapper.style.left = "-9999px";
    wrapper.style.pointerEvents = "none";
    wrapper.appendChild(clonedNode);
    this.dom.ownerDocument.body.appendChild(wrapper);

    return { element: clonedNode, wrapper, x, y };
  }

  /**
   * Tracks native drag state around draggable node handles.
   *
   * @param event - DOM event to inspect.
   * @param targetElement - Event target as an element.
   */
  private trackDraggingState(event: Event, targetElement: HTMLElement): void {
    if (
      event.type !== "mousedown" ||
      !this.editor.isEditable ||
      this.isDragging ||
      !this.node.type.spec.draggable
    ) {
      return;
    }

    const dragHandle = targetElement.closest("[data-drag-handle]");
    if (!dragHandle || (dragHandle !== this.dom && !this.dom.contains(dragHandle))) {
      return;
    }

    this.isDragging = true;
    const clearDragging = () => {
      this.isDragging = false;
    };

    this.dom.ownerDocument.addEventListener("dragend", clearDragging, { once: true });
    this.dom.ownerDocument.addEventListener("drop", clearDragging, { once: true });
    this.dom.ownerDocument.addEventListener("mouseup", clearDragging, { once: true });
  }
}

/**
 * Converts an event target to an element when possible.
 *
 * @param target - Event target to inspect.
 * @returns Target element or null.
 */
function getElement(target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) {
    return target;
  }

  if (target instanceof Text) {
    return target.parentElement;
  }

  return null;
}

/**
 * Reports whether an element behaves like an embedded control.
 *
 * @param element - Element to inspect.
 * @returns Whether the element should retain its own input events.
 */
function isInteractiveTarget(element: HTMLElement): boolean {
  return interactiveTagNames.has(element.tagName) || element.isContentEditable;
}

/**
 * Reports whether a changed DOM node is content editable.
 *
 * @param node - DOM node to inspect.
 * @returns Whether the node is an editable element.
 */
function isEditableNode(node: globalThis.Node): boolean {
  return node instanceof HTMLElement && node.isContentEditable;
}

/**
 * Removes a temporary drag image wrapper after the browser has consumed it.
 *
 * @param wrapper - Wrapper element to remove.
 */
function scheduleDragImageCleanup(wrapper: HTMLElement): void {
  setTimeout(() => {
    wrapper.remove();
  }, 0);
}
