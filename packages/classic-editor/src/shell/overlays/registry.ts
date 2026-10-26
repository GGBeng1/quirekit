import {
  type ComponentInternalInstance,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  ref
} from "vue";
import {
  classicEditorOverlayOwnerAttribute,
  releaseIdleClassicEditorOverlayState,
  resolveClassicEditorOverlayState,
  type ClassicEditorOverlayDocumentState
} from "./document-state";

export { classicEditorOverlayOwnerAttribute } from "./document-state";

/** Root resolver supplied by a standalone Classic floating surface. */
export interface ClassicEditorOverlayScope {
  /** Resolves the current mounted Classic root, if one exists. */
  readonly resolveRoot: () => HTMLElement | undefined;
}

/** Optional interaction policy for one registered Classic overlay. */
export interface ClassicEditorOverlayOptions {
  /** Resolves an active parent when this popup belongs to a selection Toolbar. */
  readonly resolveParentId?: (() => string | undefined) | undefined;
  /** Reports whether the coordinator owns Escape dismissal; disable for a headless component owner. */
  readonly dismissOnEscape?: (() => boolean) | undefined;
  /** Reports whether a pointer outside may dismiss the active surface. */
  readonly dismissOnOutsidePointer?: (() => boolean) | undefined;
}

/**
 * Minimal mutable boolean-ref contract consumed by the overlay coordinator.
 *
 * Keeping this structural avoids leaking Vue's type-only exports into the
 * standalone runtime bundle while remaining compatible with `ref()` and
 * writable `computed()`.
 */
export interface ClassicEditorOverlayVisibility {
  /** Current controlled visibility. */
  value: boolean;
}

/** Vue-facing controller for one controlled Classic Editor overlay. */
export interface ClassicEditorOverlayController {
  /** Stable value assigned to trigger and teleported-content owner attributes. */
  readonly id: string;
  /** Reads the current controlled visibility. */
  readonly isVisible: () => boolean;
  /** Updates visibility and transfers ownership within one Classic root. */
  readonly setVisible: (visible: boolean) => void;
  /** Closes this surface and releases root-scoped ownership. */
  readonly close: () => void;
  /** HTML attributes attached to the trigger and teleported overlay content. */
  readonly ownerAttributes: Readonly<Record<typeof classicEditorOverlayOwnerAttribute, string>>;
}

let nextOverlayId = 0;

/**
 * Resolves the nearest Classic root from a mounted Vue component.
 *
 * Shell components and remaining independently mounted widgets resolve ownership
 * from mounted DOM; standalone surfaces can supply an explicit scope.
 *
 * @param instance - Vue component that created the controlled overlay.
 * @returns Nearest mounted Classic root, when the component belongs to one.
 */
function resolveComponentOverlayRoot(
  instance: ComponentInternalInstance | null
): HTMLElement | undefined {
  const node = instance?.vnode.el as Node | null | undefined;
  if (node === null || node === undefined) return undefined;
  const element = node.nodeType === 1
    ? node as Element
    : node.parentElement;
  return element?.closest<HTMLElement>(".qk-classic-editor") ?? undefined;
}

/**
 * Creates one controlled overlay participating in root-scoped exclusivity.
 *
 * Opening a surface closes the previously active surface in the same Classic
 * root. A capture-phase document guard closes every surface outside the target
 * before canvas input handlers can consume the pointer event.
 *
 * @param family - Human-readable identity prefix used for DOM diagnostics.
 * @param visible - Optional existing visibility ref owned by the component.
 * @param ownerDocument - Optional browser document that owns the overlay.
 * @param scope - Optional explicit Classic root or dynamic root resolver.
 * @param options - Optional outside-pointer dismissal policy.
 * @returns Controlled visibility and reusable ownership attributes.
 */
export function useClassicEditorOverlay(
  family: string,
  visible: ClassicEditorOverlayVisibility = ref(false),
  ownerDocument: Document | undefined = typeof document === "undefined"
    ? undefined
    : document,
  scope?: ClassicEditorOverlayScope | HTMLElement,
  options: ClassicEditorOverlayOptions = {}
): ClassicEditorOverlayController {
  const ownerInstance = getCurrentInstance();
  const id = `qk-${family}-${++nextOverlayId}`;
  const ownerAttributes = Object.freeze({
    [classicEditorOverlayOwnerAttribute]: id
  }) as Readonly<Record<typeof classicEditorOverlayOwnerAttribute, string>>;
  let activeState: ClassicEditorOverlayDocumentState | undefined;
  let activeRoot: HTMLElement | undefined;
  let visibilityRevision = 0;

  /** Releases root-scoped ownership only when this surface is still active. */
  function release(): void {
    const state = activeState;
    state?.coordinator.release(id);
    activeState = undefined;
    activeRoot = undefined;
    if (state !== undefined) releaseIdleClassicEditorOverlayState(state);
  }

  /** Closes the controlled surface and releases root-scoped ownership. */
  function close(): void {
    visibilityRevision += 1;
    visible.value = false;
    release();
  }

  /**
   * Reads the component-owned visibility state.
   *
   * @returns Whether this overlay is visible.
   */
  function isVisible(): boolean {
    return visible.value;
  }

  /**
   * Updates visibility and transfers exclusive root ownership.
   *
   * @param value - Requested controlled visibility.
   */
  function setVisible(value: boolean): void {
    if (!value) { close(); return; }
    const root = scope === undefined
      ? undefined
      : "resolveRoot" in scope
        ? scope.resolveRoot()
        : scope;
    const resolvedRoot = root
      ?? resolveComponentOverlayRoot(ownerInstance);
    const resolvedDocument = resolvedRoot?.ownerDocument ?? ownerDocument;
    if (resolvedDocument === undefined) {
      visible.value = true;
      release();
      return;
    }
    const state = resolveClassicEditorOverlayState(resolvedDocument);
    // Controlled emits can synchronously re-enter through a consumer watcher.
    // Reuse an already registered identity in the same root instead of replacing it.
    if (activeState === state && activeRoot === resolvedRoot
      && state.coordinator.activeIds.includes(id)) return;
    if (activeState !== state) release();
    activeState = state;
    activeRoot = resolvedRoot;
    const revision = ++visibilityRevision;
    const replaced = state.coordinator.activate({
      id,
      root: resolvedRoot,
      parentId: options.resolveParentId?.(),
      close,
      dismissOnOutsidePointer: options.dismissOnOutsidePointer,
      dismissOnEscape: options.dismissOnEscape
    });
    // Flush the previous controlled layer's teardown before Ark registers the
    // replacement, otherwise removing that layer dismisses its apparent child.
    if (replaced) {
      void nextTick(() => {
        if (revision === visibilityRevision) visible.value = true;
      });
    } else {
      visible.value = true;
    }
  }

  onBeforeUnmount(close);
  return Object.freeze({
    id,
    isVisible,
    setVisible,
    close,
    ownerAttributes
  });
}
