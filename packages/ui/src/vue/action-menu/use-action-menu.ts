import { useQuireOverlayHost } from "../overlay-provider";
import { useMenu, type UseMenuProps } from "@ark-ui/vue/menu";
import { computed, nextTick, ref, shallowRef, useId, watch } from "vue";
import type { QuireKitActionMenuProps, QuireKitActionMenuRequest } from "../../components/action-menu";
import type { QuireKitTaskCloseReason, QuireKitTaskCloseRequest } from "../../components/task";
import { useDrawerRuntime } from "../drawer/use-runtime";
import { useQuireKitMessages } from "../locale-provider/context";
import { useModalSurfaceOwner } from "../shared/surface/use-modal-owner";
import { useAdaptivePresentation } from "../shared/task/presentation/use-adaptive-presentation";
import { createTaskRequests } from "../shared/task/session/requests";
import { useTaskLifecycle } from "../shared/task/session/lifecycle";
import { isContextMenuKey } from "../menu/context/keyboard";
import { indexActionMenu, resolveActionMenuLevel } from "./path";
import { useActionMenuAnchor } from "./anchor";
import { useActionMenuFocus } from "./focus";
import { useActionMenuKeyboard } from "./keyboard";
import type { ActionMenuBottomApi, ActionMenuCallbacks, ActionMenuView } from "./types";

/**
 * Owns one action session while Menu and Drawer retain their separate widget behavior.
 * @param props - Live public task inputs.
 * @param events - Sole public notification owner.
 * @returns Bindings for one stable trigger and mutually exclusive task content.
 */
export function useActionMenu(props: QuireKitActionMenuProps, events: ActionMenuCallbacks) {
  const id = `action-menu-${useId()}`;
  const triggerId = `${id}-trigger`;
  const contentId = `${id}-content`;
  const trigger = shallowRef<HTMLElement>();
  const opener = shallowRef<HTMLElement>();
  const origin = ref<"button" | "region" | "point">("button");
  const point = shallowRef<{ x: number; y: number }>();
  const path = ref<readonly string[]>([]);
  const failed = ref(false);
  const pathChanged = ref(false);
  const text = useQuireKitMessages("actionMenu");
  const bottom = ref<ActionMenuBottomApi>();
  const views = new Map<string, ActionMenuView>();
  const host = useQuireOverlayHost();
  const owner = useModalSurfaceOwner();
  const presentation = useAdaptivePresentation(trigger, () => props.presentation);
  const requests = createTaskRequests(id);
  const index = computed(() => indexActionMenu(props.actions));
  const level = computed(() => resolveActionMenuLevel(props.actions, path.value));

  /** Discards all private directory state at the session boundary. */
  function reset(): void { path.value = []; failed.value = false; pathChanged.value = false; views.clear(); }
  const lifecycle = useTaskLifecycle({ props, ownerReady: owner.ready, presentation, requests, events: { ...events, begin: reset, end: reset } });
  const desktopOpen = computed(() => lifecycle.open.value && presentation.resolved.value === "desktop");
  const bottomOpen = computed(() => lifecycle.open.value && presentation.resolved.value === "bottom");
  const menu = useMenu(computed<UseMenuProps>(() => ({
    id: `${id}-menu`, ids: { trigger: triggerId, content: contentId }, open: desktopOpen.value,
    closeOnSelect: false, loopFocus: true, typeahead: true, "aria-label": props.title,
    positioning: { placement: "bottom-start", strategy: host.strategy.value ?? "fixed", gutter: 4, flip: true, slide: true, overflowPadding: 8 },
    /** @param details - Native Menu open request. */
    onOpenChange(details) {
      if (presentation.resolved.value !== "desktop") return;
      if (details.open) lifecycle.requestOpen(); else lifecycle.requestClose("trigger");
    },
    /** @param event - Topmost Menu Escape. */
    onEscapeKeyDown(event) { if (!event.defaultPrevented && desktopOpen.value) lifecycle.requestClose("escape"); event.preventDefault(); },
    /** @param event - Outside intent already filtered through nested layers. */
    onInteractOutside(event) { if (!event.defaultPrevented && desktopOpen.value) lifecycle.requestClose("outside"); event.preventDefault(); }
  })));
  let drawerCloseReason: QuireKitTaskCloseReason = "programmatic";
  /** @param request - Original guarded Drawer close intent. */
  function guardDrawer(request: QuireKitTaskCloseRequest): void {
    if (presentation.resolved.value !== "bottom") request.preventDefault();
    lifecycle.guardClose(request);
    if (!request.defaultPrevented) drawerCloseReason = request.reason;
  }
  const drawer = useDrawerRuntime({
    get open() { return bottomOpen.value; }, side: "bottom", modal: true, trapFocus: true, preventScroll: true,
    restoreFocus: true, closeOnEscape: true, closeOnInteractOutside: true, snapPoints: [1], dragEnabled: false,
    onCloseRequest: guardDrawer,
    /** @returns The actual task entry or explicit host destination. */
    finalFocusEl: () => owner.ready.value ? props.finalFocusEl?.() ?? opener.value ?? trigger.value ?? null : null,
    /** @returns The title-first touch destination, without forcing the soft keyboard. */
    initialFocusEl: () => trigger.value?.ownerDocument.getElementById(contentId) ?? null
  }, {
    updateOpen: open => {
      if (presentation.resolved.value !== "bottom") return;
      if (open) lifecycle.requestOpen(); else lifecycle.acceptClose(drawerCloseReason);
    },
    openChange: () => {}, closeRequest: guardDrawer, snapPointChange: () => {}, triggerValueChange: () => {}
  }, { id: `${id}-drawer`, ids: { trigger: triggerId, content: contentId } });
  useActionMenuAnchor(menu, desktopOpen, opener, origin, point);
  useActionMenuFocus(desktopOpen, owner.ready, opener, contentId, triggerId, () => props.finalFocusEl?.());
  const handleDesktopKeydown = useActionMenuKeyboard(menu, desktopOpen, trigger);

  /** @param element - Persistent real trigger emitted by the shared adapter. */
  function setTrigger(element: HTMLElement): void { trigger.value = element; opener.value ??= element; }
  /** @param event - Original opening input. @returns Whether delegation can continue. */
  function prepare(event: Event): boolean {
    if (props.disabled || !owner.ready.value || !presentation.resolveForEvent(event)) return false;
    opener.value = trigger.value; origin.value = "button"; point.value = undefined;
    return true;
  }
  /** @returns Current original-event bindings, with no duplicate click owner. */
  function getBindings(): object {
    return presentation.resolved.value === "desktop" ? { ...menu.api.value.getTriggerProps(), onKeydown: handleDesktopKeydown }
      : presentation.resolved.value === "bottom" ? drawer.api.value.getTriggerProps() : {};
  }
  /** @param event - Native pointer context menu or standard keyboard context entry. */
  function openContext(event: MouseEvent | KeyboardEvent): void {
    if (event.defaultPrevented || props.disabled || !owner.ready.value) return;
    if (event.type === "keydown" && ((event as KeyboardEvent).isComposing || (event as KeyboardEvent).keyCode === 229 || !isContextMenuKey(event as KeyboardEvent))) return;
    if (!presentation.resolveForEvent(event)) return;
    event.preventDefault(); event.stopPropagation();
    opener.value = event.currentTarget as HTMLElement;
    origin.value = event.type === "keydown" ? "region" : "point";
    point.value = event.type === "keydown" ? undefined : { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
    lifecycle.requestOpen();
  }

  /** @param value - Current row's stable identity. @returns Completion of a branch transition or current command. */
  async function activate(value: string): Promise<void> {
    if (!lifecycle.open.value || requests.submitting.value) return;
    const location = index.value.get(value);
    if (!location || location.disabled) return;
    if (location.action.kind === "branch") {
      const view = bottom.value?.captureView();
      views.set(JSON.stringify(path.value), { ...view, scrollTop: view?.scrollTop ?? 0, focusedValue: value });
      path.value = [...location.path, value]; failed.value = false;
      await bottom.value?.restoreView({ scrollTop: 0, focusedValue: null });
      return;
    }
    const context = requests.startSubmission();
    if (!context) return;
    const request: QuireKitActionMenuRequest = Object.freeze({ ...context, value, path: Object.freeze([...location.path]) });
    failed.value = false;
    try {
      const result = props.execute?.(request);
      if (result) await result;
      if (!requests.isCurrent(request, "submission")) return;
      requests.finishSubmission(request);
      if (requests.sessionId.value !== request.sessionId) return;
      events.action({ value, path: request.path, sessionId: request.sessionId });
      if (requests.sessionId.value === request.sessionId) lifecycle.requestClose("action");
    } catch (error) {
      if (!requests.isCurrent(request, "submission")) return;
      requests.finishSubmission(request);
      if (requests.sessionId.value !== request.sessionId) return;
      if (error instanceof Error && error.name === "AbortError") return;
      failed.value = true; events.error({ error, request });
    }
  }
  /** @returns Completion after the previous directory's focus and scroll have been restored. */
  async function back(): Promise<void> {
    if (requests.submitting.value || path.value.length === 0) return;
    path.value = path.value.slice(0, -1); failed.value = false;
    await bottom.value?.restoreView(views.get(JSON.stringify(path.value)) ?? { scrollTop: 0, focusedValue: null });
  }
  watch(level, current => {
    if (current.path.length === path.value.length) return;
    path.value = current.path; pathChanged.value = true;
    void nextTick(() => bottom.value?.restoreView({ scrollTop: 0, focusedValue: null }));
  });
  return { triggerId, contentId, trigger, bottom, path, level, lifecycle, requests, presentation, menu, drawer,
    desktopOpen, bottomOpen, prepare, getBindings, setTrigger, openContext, activate, back,
    errorText: computed(() => failed.value ? props.errorText ?? text.value.error : undefined),
    pathStatus: computed(() => pathChanged.value ? text.value.directoryUpdated : undefined) };
}
