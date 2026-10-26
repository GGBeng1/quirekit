import type {
  Decoration,
  DecorationSource,
  Node as PMNode
} from "@quirekit/pm";
import type { QuireEditor } from "../Editor";

/** Directions where resize handles can be placed. */
export type ResizableNodeViewDirection =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

/** Width and height for a resizable node. */
export interface ResizableNodeDimensions {
  /** Width in CSS pixels. */
  readonly width: number;
  /** Height in CSS pixels. */
  readonly height: number;
}

/** CSS class names applied to resizable node view elements. */
export interface ResizableNodeViewClassNames {
  /** Class applied to the outer container. */
  readonly container?: string | undefined;
  /** Class applied to the wrapper around the resized element. */
  readonly wrapper?: string | undefined;
  /** Class applied to each resize handle. */
  readonly handle?: string | undefined;
  /** Class applied while a resize interaction is active. */
  readonly resizing?: string | undefined;
}

/** Runtime behavior options for a resizable node view. */
export interface ResizableNodeViewBehaviorOptions {
  /** Handle directions to render. */
  readonly directions?: readonly ResizableNodeViewDirection[] | undefined;
  /** Minimum dimensions. */
  readonly min?: Partial<ResizableNodeDimensions> | undefined;
  /** Maximum dimensions. */
  readonly max?: Partial<ResizableNodeDimensions> | undefined;
  /** Whether aspect ratio should always be preserved. */
  readonly preserveAspectRatio?: boolean | undefined;
  /** CSS class names applied to generated elements. */
  readonly className?: ResizableNodeViewClassNames | undefined;
  /**
   * Creates a custom resize handle element.
   *
   * @param direction - Direction represented by the handle.
   * @returns Custom handle element.
   */
  readonly createCustomHandle?:
    | ((direction: ResizableNodeViewDirection) => HTMLElement)
    | undefined;
}

/** Options required to create a resizable node view. */
export interface ResizableNodeViewOptions {
  /** DOM element that should be resized. */
  readonly element: HTMLElement;
  /** Optional content element exposed as `contentDOM`. */
  readonly contentElement?: HTMLElement | undefined;
  /** ProseMirror node represented by the view. */
  readonly node: PMNode;
  /** Editor instance that owns the view. */
  readonly editor: QuireEditor;
  /**
   * Resolves the current node position.
   *
   * @returns Current node position or undefined when detached.
   */
  readonly getPos: () => number | undefined;
  /**
   * Runs while the resize interaction is active.
   *
   * @param width - Current width in CSS pixels.
   * @param height - Current height in CSS pixels.
   */
  readonly onResize?: ((width: number, height: number) => void) | undefined;
  /**
   * Runs once when the resize interaction finishes.
   *
   * @param width - Final width in CSS pixels.
   * @param height - Final height in CSS pixels.
   */
  readonly onCommit: (width: number, height: number) => void;
  /**
   * Handles node updates from the mounted view.
   *
   * @param node - Updated node.
   * @param decorations - Active node decorations.
   * @param innerDecorations - Active inner decorations.
   * @returns Whether the update can be accepted by this view.
   */
  readonly onUpdate?:
    | ((
      node: PMNode,
      decorations: readonly Decoration[],
      innerDecorations: DecorationSource
    ) => boolean)
    | undefined;
  /** Optional resize behavior configuration. */
  readonly options?: ResizableNodeViewBehaviorOptions | undefined;
}

/** Normalized CSS class names. */
interface NormalizedResizableNodeViewClassNames {
  /** Class applied to the outer container. */
  readonly container: string;
  /** Class applied to the wrapper around the resized element. */
  readonly wrapper: string;
  /** Class applied to each resize handle. */
  readonly handle: string;
  /** Class applied while a resize interaction is active. */
  readonly resizing: string;
}

/** Active resize interaction state. */
interface ResizeInteractionState {
  /** Handle direction being dragged. */
  readonly direction: ResizableNodeViewDirection;
  /** Pointer x coordinate at interaction start. */
  readonly startX: number;
  /** Pointer y coordinate at interaction start. */
  readonly startY: number;
  /** Element width at interaction start. */
  readonly startWidth: number;
  /** Element height at interaction start. */
  readonly startHeight: number;
  /** Whether shift was pressed at interaction start. */
  readonly shiftKey: boolean;
}

const defaultDirections: readonly ResizableNodeViewDirection[] = [
  "bottom-left",
  "bottom-right",
  "top-left",
  "top-right"
];

const defaultMinSize: ResizableNodeDimensions = {
  width: 8,
  height: 8
};

/** DOM NodeView helper that adds resize handles to an element. */
export class ResizableNodeView {
  /** ProseMirror node represented by this view. */
  node: PMNode;

  /** Editor instance that owns this view. */
  editor: QuireEditor;

  /** DOM element that is visually resized. */
  element: HTMLElement;

  /** Optional editable content element. */
  contentElement?: HTMLElement | undefined;

  /** Outer container returned as the node view DOM. */
  container: HTMLElement;

  /** Wrapper that holds the resized element and handles. */
  wrapper: HTMLElement;

  /** Position resolver for the represented node. */
  getPos: () => number | undefined;

  /** Callback fired during resize. */
  onResize?: ((width: number, height: number) => void) | undefined;

  /** Callback fired after resize commit. */
  onCommit: (width: number, height: number) => void;

  /** Optional node update callback. */
  onUpdate?: ResizableNodeViewOptions["onUpdate"];

  /** Active handle directions. */
  directions: readonly ResizableNodeViewDirection[];

  /** Minimum dimensions. */
  minSize: ResizableNodeDimensions;

  /** Optional maximum dimensions. */
  maxSize?: Partial<ResizableNodeDimensions> | undefined;

  /** Whether aspect ratio is always preserved. */
  preserveAspectRatio: boolean;

  /** CSS class names for generated elements. */
  classNames: NormalizedResizableNodeViewClassNames;

  /** Optional custom handle factory. */
  createCustomHandle:
    | ((direction: ResizableNodeViewDirection) => HTMLElement)
    | undefined;

  private readonly handleMap = new Map<ResizableNodeViewDirection, HTMLElement>();

  private readonly editorUpdateHandler = () => {
    this.syncEditableState();
  };

  private activeResize: ResizeInteractionState | null = null;

  private aspectRatio = 1;

  private lastEditableState: boolean | undefined;

  /**
   * Creates a resizable node view.
   *
   * @param options - Resizable node view options.
   */
  constructor(options: ResizableNodeViewOptions) {
    this.node = options.node;
    this.editor = options.editor;
    this.element = options.element;
    this.contentElement = options.contentElement;
    this.getPos = options.getPos;
    this.onResize = options.onResize;
    this.onCommit = options.onCommit;
    this.onUpdate = options.onUpdate;
    this.directions = options.options?.directions ?? defaultDirections;
    this.minSize = {
      ...defaultMinSize,
      ...options.options?.min
    };
    this.maxSize = options.options?.max;
    this.preserveAspectRatio = options.options?.preserveAspectRatio ?? false;
    this.classNames = normalizeClassNames(options.options?.className);
    this.createCustomHandle = options.options?.createCustomHandle;
    this.wrapper = this.createWrapper();
    this.container = this.createContainer();

    this.applyInitialSize();
    this.syncEditableState();
    this.editor.on("update", this.editorUpdateHandler);
  }

  /**
   * Returns the outer DOM element for ProseMirror-style node view consumers.
   *
   * @returns Node view DOM element.
   */
  get dom(): HTMLElement {
    return this.container;
  }

  /**
   * Returns the editable content DOM element.
   *
   * @returns Content DOM element or null.
   */
  get contentDOM(): HTMLElement | null {
    return this.contentElement ?? null;
  }

  /**
   * Handles node updates from the mounted view.
   *
   * @param node - Updated node.
   * @param decorations - Active node decorations.
   * @param innerDecorations - Active inner decorations.
   * @returns Whether this view can represent the updated node.
   */
  update(
    node: PMNode,
    decorations: readonly Decoration[],
    innerDecorations: DecorationSource
  ): boolean {
    if (node.type !== this.node.type) {
      return false;
    }

    this.node = node;
    return this.onUpdate?.(node, decorations, innerDecorations) ?? true;
  }

  /**
   * Cleans up DOM and editor event listeners.
   */
  destroy(): void {
    this.cancelActiveResize();
    this.removeHandles();
    this.editor.off("update", this.editorUpdateHandler);
    this.container.remove();
  }

  /**
   * Creates the outer container element.
   *
   * @returns Container element.
   */
  createContainer(): HTMLElement {
    const element = this.element.ownerDocument.createElement("div");
    element.dataset.resizeContainer = "";
    element.dataset.node = this.node.type.name;
    element.style.display = "flex";

    if (this.classNames.container) {
      element.className = this.classNames.container;
    }

    element.appendChild(this.wrapper);
    return element;
  }

  /**
   * Creates the wrapper element that holds content and handles.
   *
   * @returns Wrapper element.
   */
  createWrapper(): HTMLElement {
    const element = this.element.ownerDocument.createElement("div");
    element.dataset.resizeWrapper = "";
    element.style.position = "relative";
    element.style.display = "block";

    if (this.classNames.wrapper) {
      element.className = this.classNames.wrapper;
    }

    element.appendChild(this.element);
    return element;
  }

  /**
   * Applies initial dimensions from node attributes or current DOM size.
   */
  private applyInitialSize(): void {
    const width = readNumber(this.node.attrs.width) ?? this.element.offsetWidth;
    const height = readNumber(this.node.attrs.height) ?? this.element.offsetHeight;

    if (width > 0) {
      this.element.style.width = `${width}px`;
    }

    if (height > 0) {
      this.element.style.height = `${height}px`;
    }

    this.aspectRatio = width > 0 && height > 0 ? width / height : 1;
  }

  /**
   * Synchronizes handle visibility with editor editability.
   */
  private syncEditableState(): void {
    if (this.editor.isEditable === this.lastEditableState) {
      return;
    }

    this.lastEditableState = this.editor.isEditable;

    if (this.editor.isEditable) {
      this.attachHandles();
    } else {
      this.removeHandles();
    }
  }

  /**
   * Adds resize handles to the wrapper.
   */
  private attachHandles(): void {
    if (this.handleMap.size > 0) {
      return;
    }

    for (const direction of this.directions) {
      const handle = this.createHandle(direction);
      this.positionHandle(handle, direction);
      handle.addEventListener("mousedown", this.handlePointerDown);
      handle.addEventListener("touchstart", this.handlePointerDown, { passive: false });
      this.wrapper.appendChild(handle);
      this.handleMap.set(direction, handle);
    }
  }

  /**
   * Removes resize handles from the wrapper.
   */
  private removeHandles(): void {
    for (const handle of this.handleMap.values()) {
      handle.removeEventListener("mousedown", this.handlePointerDown);
      handle.removeEventListener("touchstart", this.handlePointerDown);
      handle.remove();
    }

    this.handleMap.clear();
  }

  /**
   * Creates one resize handle.
   *
   * @param direction - Handle direction.
   * @returns Handle element.
   */
  private createHandle(direction: ResizableNodeViewDirection): HTMLElement {
    const handle =
      this.createCustomHandle?.(direction) ??
      this.element.ownerDocument.createElement("div");
    handle.dataset.resizeHandle = direction;
    handle.style.position = "absolute";
    handle.style.cursor = cursorForDirection(direction);

    if (this.classNames.handle) {
      handle.classList.add(this.classNames.handle);
    }

    return handle;
  }

  /**
   * Positions a resize handle inside the wrapper.
   *
   * @param handle - Handle element.
   * @param direction - Handle direction.
   */
  private positionHandle(
    handle: HTMLElement,
    direction: ResizableNodeViewDirection
  ): void {
    const isTop = direction.includes("top");
    const isBottom = direction.includes("bottom");
    const isLeft = direction.includes("left");
    const isRight = direction.includes("right");

    if (isTop) {
      handle.style.top = "0";
    }
    if (isBottom) {
      handle.style.bottom = "0";
    }
    if (isLeft) {
      handle.style.left = "0";
    }
    if (isRight) {
      handle.style.right = "0";
    }
  }

  private readonly handlePointerDown = (event: MouseEvent | TouchEvent): void => {
    const direction = getHandleDirection(event.target);
    const point = getEventPoint(event);

    if (!direction || !point) {
      return;
    }

    event.preventDefault();
    this.activeResize = {
      direction,
      startX: point.x,
      startY: point.y,
      startWidth: this.element.offsetWidth,
      startHeight: this.element.offsetHeight,
      shiftKey: event instanceof MouseEvent ? event.shiftKey : false
    };

    if (this.classNames.resizing) {
      this.container.classList.add(this.classNames.resizing);
    }

    const { ownerDocument } = this.element;
    ownerDocument.addEventListener("mousemove", this.handlePointerMove);
    ownerDocument.addEventListener("mouseup", this.handlePointerUp);
    ownerDocument.addEventListener("touchmove", this.handlePointerMove, { passive: false });
    ownerDocument.addEventListener("touchend", this.handlePointerUp);
    ownerDocument.addEventListener("keydown", this.handleKeyDown);
    ownerDocument.addEventListener("keyup", this.handleKeyUp);
  };

  private readonly handlePointerMove = (event: MouseEvent | TouchEvent): void => {
    const state = this.activeResize;
    const point = getEventPoint(event);

    if (!state || !point) {
      return;
    }

    event.preventDefault();
    const size = this.resolveSize(state, point);
    this.applySize(size);
    this.onResize?.(size.width, size.height);
  };

  private readonly handlePointerUp = (): void => {
    if (!this.activeResize) {
      return;
    }

    const size = {
      width: this.element.offsetWidth,
      height: this.element.offsetHeight
    };

    this.cancelActiveResize();
    this.onCommit(size.width, size.height);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Shift" && this.activeResize) {
      this.activeResize = {
        ...this.activeResize,
        shiftKey: true
      };
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (event.key === "Shift" && this.activeResize) {
      this.activeResize = {
        ...this.activeResize,
        shiftKey: false
      };
    }
  };

  /**
   * Cancels the active resize interaction and removes global listeners.
   */
  private cancelActiveResize(): void {
    if (!this.activeResize) {
      return;
    }

    const { ownerDocument } = this.element;
    ownerDocument.removeEventListener("mousemove", this.handlePointerMove);
    ownerDocument.removeEventListener("mouseup", this.handlePointerUp);
    ownerDocument.removeEventListener("touchmove", this.handlePointerMove);
    ownerDocument.removeEventListener("touchend", this.handlePointerUp);
    ownerDocument.removeEventListener("keydown", this.handleKeyDown);
    ownerDocument.removeEventListener("keyup", this.handleKeyUp);

    if (this.classNames.resizing) {
      this.container.classList.remove(this.classNames.resizing);
    }

    this.activeResize = null;
  }

  /**
   * Resolves the next element size from an active pointer interaction.
   *
   * @param state - Active resize state.
   * @param point - Current pointer point.
   * @returns Clamped element dimensions.
   */
  private resolveSize(
    state: ResizeInteractionState,
    point: { readonly x: number; readonly y: number }
  ): ResizableNodeDimensions {
    const deltaX = point.x - state.startX;
    const deltaY = point.y - state.startY;
    let width = state.startWidth + horizontalDelta(state.direction, deltaX);
    let height = state.startHeight + verticalDelta(state.direction, deltaY);

    if (this.preserveAspectRatio || state.shiftKey) {
      if (Math.abs(width - state.startWidth) > Math.abs(height - state.startHeight)) {
        height = width / this.aspectRatio;
      } else {
        width = height * this.aspectRatio;
      }
    }

    return this.clampSize({ width, height });
  }

  /**
   * Clamps dimensions to configured min and max sizes.
   *
   * @param size - Candidate size.
   * @returns Clamped dimensions.
   */
  private clampSize(size: ResizableNodeDimensions): ResizableNodeDimensions {
    return {
      width: clamp(size.width, this.minSize.width, this.maxSize?.width),
      height: clamp(size.height, this.minSize.height, this.maxSize?.height)
    };
  }

  /**
   * Applies dimensions to the resized element.
   *
   * @param size - Dimensions to apply.
   */
  private applySize(size: ResizableNodeDimensions): void {
    this.element.style.width = `${Math.round(size.width)}px`;
    this.element.style.height = `${Math.round(size.height)}px`;
  }
}

/** @deprecated Use `ResizableNodeView`; retained for Tiptap API compatibility. */
export const ResizableNodeview = ResizableNodeView;

/**
 * Normalizes optional CSS class names.
 *
 * @param className - Optional class name config.
 * @returns Normalized class names.
 */
function normalizeClassNames(
  className: ResizableNodeViewClassNames | undefined
): NormalizedResizableNodeViewClassNames {
  return {
    container: className?.container ?? "",
    wrapper: className?.wrapper ?? "",
    handle: className?.handle ?? "",
    resizing: className?.resizing ?? ""
  };
}

/**
 * Reads a numeric value when possible.
 *
 * @param value - Candidate value.
 * @returns Number value or undefined.
 */
function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * Reads the resize direction from an event target.
 *
 * @param target - Event target to inspect.
 * @returns Resize direction or undefined.
 */
function getHandleDirection(
  target: EventTarget | null
): ResizableNodeViewDirection | undefined {
  return target instanceof HTMLElement
    ? target.dataset.resizeHandle as ResizableNodeViewDirection | undefined
    : undefined;
}

/**
 * Gets a pointer point from a mouse or touch event.
 *
 * @param event - Event to inspect.
 * @returns Pointer point or undefined.
 */
function getEventPoint(
  event: MouseEvent | TouchEvent
): { readonly x: number; readonly y: number } | undefined {
  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : undefined;
  }

  return { x: event.clientX, y: event.clientY };
}

/**
 * Gets horizontal resize delta for a direction.
 *
 * @param direction - Resize direction.
 * @param deltaX - Raw pointer x delta.
 * @returns Width delta.
 */
function horizontalDelta(direction: ResizableNodeViewDirection, deltaX: number): number {
  if (direction.includes("right")) {
    return deltaX;
  }

  if (direction.includes("left")) {
    return -deltaX;
  }

  return 0;
}

/**
 * Gets vertical resize delta for a direction.
 *
 * @param direction - Resize direction.
 * @param deltaY - Raw pointer y delta.
 * @returns Height delta.
 */
function verticalDelta(direction: ResizableNodeViewDirection, deltaY: number): number {
  if (direction.includes("bottom")) {
    return deltaY;
  }

  if (direction.includes("top")) {
    return -deltaY;
  }

  return 0;
}

/**
 * Clamps a number.
 *
 * @param value - Value to clamp.
 * @param min - Minimum value.
 * @param max - Optional maximum value.
 * @returns Clamped value.
 */
function clamp(value: number, min: number, max: number | undefined): number {
  const lowerBounded = Math.max(value, min);
  return max === undefined ? lowerBounded : Math.min(lowerBounded, max);
}

/**
 * Gets a resize cursor for a direction.
 *
 * @param direction - Resize direction.
 * @returns CSS cursor value.
 */
function cursorForDirection(direction: ResizableNodeViewDirection): string {
  if (direction === "top" || direction === "bottom") {
    return "ns-resize";
  }

  if (direction === "left" || direction === "right") {
    return "ew-resize";
  }

  if (direction === "top-left" || direction === "bottom-right") {
    return "nwse-resize";
  }

  return "nesw-resize";
}
