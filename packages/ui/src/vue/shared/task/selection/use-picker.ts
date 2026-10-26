import { computed, shallowRef, useId } from "vue";
import type { QuireKitTaskCloseReason, QuireKitTaskCloseRequest } from "../../../../components/task/types";
import { useDrawerRuntime } from "../../../drawer/use-runtime";
import { usePopoverRuntime } from "../../../popover/use-runtime";
import { useModalSurfaceOwner } from "../../surface/use-modal-owner";
import { useAdaptivePresentation } from "../presentation/use-adaptive-presentation";
import { useTaskLifecycle } from "../session/lifecycle";
import { createTaskRequests } from "../session/requests";
import { useTaskSelection } from "./controller";
import type { TaskSelectionItem, TaskSelectionSurfaceEvents, TaskSelectionSurfaceProps } from "./types";

/**
 * Binds one disposable selection session to two mutually exclusive public Ark providers.
 * @param props - Live public picker inputs.
 * @param events - Single model and notification boundary.
 * @returns Persistent entry, shared selection, and the active physical surface APIs.
 */
export function useSelectionTask<T extends TaskSelectionItem>(props: TaskSelectionSurfaceProps<T>, events: TaskSelectionSurfaceEvents) {
  const id = `selection-task-${useId()}`;
  const triggerId = `${id}-trigger`, contentId = `${id}-content`;
  const trigger = shallowRef<HTMLElement>();
  const inputOrigin = shallowRef<"pointer" | "keyboard">("pointer");
  const owner = useModalSurfaceOwner();
  const presentation = useAdaptivePresentation(trigger, () => props.presentation);
  const requests = createTaskRequests(id);
  const selection = useTaskSelection({ props, requests, events: { ...events, success: () => lifecycle.requestClose("action") } });
  const lifecycle = useTaskLifecycle({
    props: {
      get open() { return props.open; }, get defaultOpen() { return props.defaultOpen; }, get disabled() { return props.disabled; },
      /** @param request - Shared guarded intent including native IME protection. */
      onCloseRequest(request) {
        if (selection.query.composing.value) request.preventDefault();
        else props.onCloseRequest?.(request);
      }
    },
    ownerReady: owner.ready, presentation, requests,
    events: { ...events, begin: selection.reset, end: selection.reset }
  });
  const desktopOpen = computed(() => lifecycle.open.value && presentation.resolved.value === "desktop");
  const bottomOpen = computed(() => lifecycle.open.value && presentation.resolved.value === "bottom");

  /** @returns Title-first touch focus or the explicitly requested keyboard search entry. */
  function initialFocus(): HTMLElement | null {
    const content = trigger.value?.ownerDocument.getElementById(contentId);
    return inputOrigin.value === "keyboard" && props.searchable ? content?.querySelector<HTMLInputElement>('input[type="search"]') ?? content ?? null : content ?? null;
  }
  /** @returns Existing outside focus, an explicit host target, or the persistent task entry. */
  function finalFocus(): HTMLElement | null {
    if (!owner.ready.value) return null;
    const document = trigger.value?.ownerDocument;
    const active = document?.activeElement;
    const content = document?.getElementById(contentId);
    if (active && active !== document?.body && active !== trigger.value && !content?.contains(active)) return active as HTMLElement;
    return props.finalFocusEl?.() ?? trigger.value ?? null;
  }
  const popover = usePopoverRuntime({
    get open() { return desktopOpen.value; }, modal: false, portalled: true, autoFocus: true,
    initialFocusEl: initialFocus, finalFocusEl: finalFocus,
    get restoreFocus() { return owner.ready.value; }
  }, {
    updateOpen: value => { if (value) lifecycle.requestOpen(); else lifecycle.requestClose("trigger"); }, openChange: () => {},
    /** @param event - Original topmost Escape. */
    escapeKeyDown(event) { if (!event.defaultPrevented && !event.isComposing && event.keyCode !== 229) lifecycle.requestClose("escape"); event.preventDefault(); },
    /** @param event - Original outside intent filtered by Ark's layer stack. */
    interactOutside(event) { if (!event.defaultPrevented) lifecycle.requestClose("outside"); event.preventDefault(); }
  }, { id: `${id}-popover`, ids: { trigger: triggerId, content: contentId } });
  let closeReason: QuireKitTaskCloseReason = "programmatic";
  /** @param request - Original Drawer close intent. */
  function guardDrawer(request: QuireKitTaskCloseRequest): void {
    lifecycle.guardClose(request);
    if (!request.defaultPrevented) closeReason = request.reason;
  }
  const drawer = useDrawerRuntime({
    get open() { return bottomOpen.value; }, side: "bottom", modal: true, trapFocus: true, preventScroll: true,
    get restoreFocus() { return owner.ready.value; }, closeOnEscape: true, closeOnInteractOutside: true,
    snapPoints: [1], dragEnabled: false, initialFocusEl: initialFocus, finalFocusEl: finalFocus, onCloseRequest: guardDrawer
  }, {
    updateOpen: value => { if (value) lifecycle.requestOpen(); else lifecycle.acceptClose(closeReason); },
    openChange: () => {}, closeRequest: guardDrawer, snapPointChange: () => {}, triggerValueChange: () => {}
  }, { id: `${id}-drawer`, ids: { trigger: triggerId, content: contentId } });

  /** @param element - Persistent mounted task button. */
  function setTrigger(element: HTMLElement): void { trigger.value = element; }
  /** @param event - Original physical opening input. @returns Whether machine delegation is available. */
  function prepare(event: Event): boolean {
    if (props.disabled || !owner.ready.value || !presentation.resolveForEvent(event)) return false;
    if (event.type === "keydown") inputOrigin.value = "keyboard";
    else if (event.type === "pointerdown") inputOrigin.value = "pointer";
    else if (event.type === "click") inputOrigin.value = (event as MouseEvent).detail === 0 ? "keyboard" : "pointer";
    return true;
  }
  /** @returns Active machine's original trigger semantics without replacing the physical button. */
  function getBindings(): object {
    return presentation.resolved.value === "desktop" ? popover.api.value.getTriggerProps()
      : presentation.resolved.value === "bottom" ? drawer.api.value.getTriggerProps() : {};
  }
  return { triggerId, contentId, trigger, presentation, lifecycle, requests, selection, popover, drawer, setTrigger, prepare, getBindings };
}
