import { computed, onMounted, shallowRef, useId, watch } from "vue";
import type { QuireKitTaskPanelProps } from "../../components/task-panel";
import type { QuireKitTaskCloseReason, QuireKitTaskCloseRequest } from "../../components/task";
import { useAdaptivePresentation } from "../shared/task/presentation/use-adaptive-presentation";
import { useModalSurfaceOwner } from "../shared/surface/use-modal-owner";
import { createTaskRequests } from "../shared/task/session/requests";
import { useTaskLifecycle } from "../shared/task/session/lifecycle";
import type { TaskLifecycleEvents } from "../shared/task/session/types";
import { usePopoverRuntime } from "../popover/use-runtime";
import { useDrawerRuntime } from "../drawer/use-runtime";
import { useTaskPanelViewport } from "./viewport";
import { trackContextMenuRegion } from "../menu/context/anchor";

/** @param props - Reactive public shell settings. @param events - Sole session notifications. @returns Stable entry and mutually exclusive providers. */
export function useTaskPanel(props: QuireKitTaskPanelProps, events: TaskLifecycleEvents) {
  const id = `task-panel-${useId()}`, triggerId = `${id}-trigger`, contentId = `${id}-content`;
  const trigger = shallowRef<HTMLElement>();
  const owner = useModalSurfaceOwner();
  const presentation = useAdaptivePresentation(trigger, () => props.presentation);
  const requests = createTaskRequests(id);
  const lifecycle = useTaskLifecycle({ props, ownerReady: owner.ready, presentation, requests, events });
  const desktop = computed(() => lifecycle.open.value && presentation.resolved.value === "desktop");
  const bottom = computed(() => lifecycle.open.value && presentation.resolved.value === "bottom");
  const bottomStyle = useTaskPanelViewport(trigger, computed(() => presentation.resolved.value === "bottom" && presentation.phase.value !== "closed"), computed(() => props.maxHeight));
  /** @returns Original owner-local focus destination, never a global query. */
  function finalFocus(): HTMLElement | null { return owner.ready.value ? props.finalFocusEl?.() ?? trigger.value ?? null : null; }
  /** @returns Title-first focus avoids summoning the keyboard without a search intent. */
  function initialFocus(): HTMLElement | null { return trigger.value?.ownerDocument.getElementById(contentId) ?? null; }
  /** @param request - Existing synchronous surface intent. */
  function guard(request: QuireKitTaskCloseRequest): void {
    if (props.busy) request.preventDefault();
    lifecycle.guardClose(request);
  }
  let closeReason: QuireKitTaskCloseReason = "programmatic";
  /** @param request - One original Drawer close request; the prop also marks dragging as guarded. */
  function guardDrawer(request: QuireKitTaskCloseRequest): void { guard(request); if (!request.defaultPrevented) closeReason = request.reason; }
  const popover = usePopoverRuntime({
    get open() { return desktop.value; }, get placement() { return props.placement ?? "bottom-start"; },
    modal: true, get restoreFocus() { return props.restoreFocus !== false; }, initialFocusEl: initialFocus, finalFocusEl: finalFocus, hideWhenDetached: false,
  }, {
    updateOpen: value => { if (presentation.resolved.value === "desktop") value ? lifecycle.requestOpen() : !props.busy && lifecycle.requestClose(); },
    openChange: () => {},
    escapeKeyDown: event => { if (!event.defaultPrevented && !props.busy) lifecycle.requestClose("escape"); event.preventDefault(); },
    interactOutside: event => { if (!event.defaultPrevented && !props.busy) lifecycle.requestClose("outside"); event.preventDefault(); },
  }, { id: `${id}-popover`, ids: { trigger: triggerId, content: contentId } });
  const drawer = useDrawerRuntime({
    get open() { return bottom.value; }, side: "bottom", modal: true, trapFocus: true, preventScroll: true,
    get restoreFocus() { return props.restoreFocus !== false; }, initialFocusEl: initialFocus, finalFocusEl: finalFocus, closeOnEscape: true, closeOnInteractOutside: true,
    snapPoints: [1], dragEnabled: false,
    onCloseRequest: guardDrawer,
  }, {
    updateOpen: value => { if (presentation.resolved.value === "bottom") value ? lifecycle.requestOpen() : lifecycle.acceptClose(closeReason); },
    openChange: () => {}, closeRequest: guardDrawer, snapPointChange: () => {}, triggerValueChange: () => {},
  }, { id: `${id}-drawer`, ids: { trigger: triggerId, content: contentId } });
  onMounted(() => { trigger.value ??= props.anchorEl?.() ?? undefined; });
  watch(() => props.anchorEl?.(), element => { if (element) trigger.value = element; }, { flush: "post" });
  // Follow only an open desktop anchor; input and off-screen directories do no geometry work.
  watch([desktop, trigger], ([open, element], _old, cleanup) => {
    if (!open || !element) return;
    cleanup(trackContextMenuRegion(element, () => popover.api.value.reposition({ getAnchorRect: () => element.getBoundingClientRect() })));
  }, { flush: "post" });
  /** @param element - Stable actual opening button. */
  function setTrigger(element: HTMLElement): void { trigger.value = element; }
  /** @param event - Original event before widget delegation. @returns Whether opening can continue. */
  function prepare(event: Event): boolean { return !props.disabled && owner.ready.value && !!presentation.resolveForEvent(event); }
  /** @returns Bindings from the effective widget only. */
  function getBindings(): object { return presentation.resolved.value === "bottom" ? drawer.api.value.getTriggerProps() : popover.api.value.getTriggerProps(); }
  return { bottomStyle, triggerId, contentId, trigger, presentation, lifecycle, popover, drawer, setTrigger, prepare, getBindings };
}
