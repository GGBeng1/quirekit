import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
  type Ref
} from "vue";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { ClassicEditorPopmenuItem } from "@classic/types";
import { useClassicEditorShellContributions } from "../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../types";
import {
  readClassicEditorCustomEventDetail,
  readClassicEditorPopmenuClientPoint
} from "./event-detail";
import { createClassicEditorPopmenuListeners } from "./listeners";
import type { ClassicEditorActivePopmenu } from "./types";
import { resolveClassicEditorContributionBehavior } from "../contribution/utils";

/**
 * Owns semantic popmenu discovery, positioning, execution, and dismissal.
 *
 * @param model - Reactive private shell model.
 * @param root - Current product root that receives bubbling semantic events.
 * @returns Reactive dropdown state and actions.
 */
export function useClassicEditorProductPopmenu(
  model: Readonly<Ref<ClassicEditorShellModel>>,
  root: Readonly<Ref<HTMLElement | undefined>>
) {
  const { select, text } = useClassicEditorShellContributions(model);
  const active = ref<ClassicEditorActivePopmenu | null>(null);
  const notice = ref<string | null>(null);
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  const contributions = computed(() => select("popmenu"));
  const items = computed(() => resolveItems(active.value));
  const options = computed<QuireKitMenuEntry[]>(() => items.value.map((item) => {
    const payload = resolvePayload(item, active.value?.detail);
    return {
      value: item.id,
      label: text(item.label),
      disabled: (() => {
        const context = model.value.context;
        if (context === undefined) return true;
        const behavior = resolveClassicEditorContributionBehavior(item);
        return behavior === undefined
          || !context.instance.canExecuteContribution(behavior, payload);
      })()
    };
  }));

  const listeners = createClassicEditorPopmenuListeners({
    open,
    close
  });

  watch(
    [root, contributions],
    ([currentRoot, currentContributions]) =>
      listeners.updateRoot(currentRoot, currentContributions),
    { immediate: true }
  );
  watch(
    root,
    (currentRoot) => listeners.updateDocument(currentRoot?.ownerDocument),
    { immediate: true }
  );

  onBeforeUnmount(() => {
    listeners.destroy();
    if (noticeTimer !== undefined) clearTimeout(noticeTimer);
  });

  /**
   * Resolves currently applicable and installed items.
   *
   * @param state - Current semantic trigger state.
   * @returns Visible menu items in contribution order.
   */
  function resolveItems(
    state: ClassicEditorActivePopmenu | null
  ): readonly ClassicEditorPopmenuItem[] {
    const context = model.value.context;
    if (state === null || context === undefined) return [];
    const contribution = contributions.value.find(
      (item) => item.id === state.contributionId
    );
    if (contribution === undefined) return [];
    return contribution.items(state.detail, context).filter((item) =>
      item.when?.(state.detail, context) !== false
      && (() => {
        const behavior = resolveClassicEditorContributionBehavior(item);
        return behavior !== undefined && context.instance.isContributionAvailable(
          behavior,
          resolvePayload(item, state.detail)
        );
      })()
    );
  }

  /**
   * Opens the first applicable menu for one semantic event.
   *
   * @param eventType - Contribution trigger event type.
   * @param event - Bubbling mounted-View event.
   */
  function open(eventType: string, event: Event): void {
    const context = model.value.context;
    const detail = readClassicEditorCustomEventDetail(event);
    const point = readClassicEditorPopmenuClientPoint(detail);
    if (context === undefined || detail === undefined || point === undefined) return;
    const contribution = contributions.value.find((candidate) =>
      candidate.eventType === eventType
      && candidate.items(detail, context).some((item) =>
        item.when?.(detail, context) !== false
        && (() => {
          const behavior = resolveClassicEditorContributionBehavior(item);
          return behavior !== undefined && context.instance.isContributionAvailable(
            behavior,
            resolvePayload(item, detail)
          );
        })()
      )
    );
    if (contribution === undefined) return;
    active.value = {
      contributionId: contribution.id,
      detail,
      x: point.x,
      y: point.y
    };
  }

  /**
   * Executes one active menu item and closes the surface.
   *
   * @param key - Stable public menu value.
   */
  async function execute(key: string | number): Promise<void> {
    const state = active.value;
    const item = items.value.find((candidate) => candidate.id === String(key));
    if (state === null || item === undefined) return;
    const context = model.value.context;
    const behavior = context === undefined
      ? undefined
      : resolveClassicEditorContributionBehavior(item);
    const handled = behavior === undefined ? false : await context!.instance
      .executeContribution(
        behavior,
        resolvePayload(item, state.detail),
        { source: "semantic-popmenu", detail: state.detail }
      );
    if (!handled && item.failureMessage !== undefined) {
      showNotice(text(item.failureMessage));
    }
    close();
  }

  /**
   * Shows one short-lived accessible product notice.
   *
   * @param message - Fully localized feedback text.
   */
  function showNotice(message: string): void {
    if (noticeTimer !== undefined) clearTimeout(noticeTimer);
    notice.value = message;
    noticeTimer = setTimeout(() => {
      notice.value = null;
      noticeTimer = undefined;
    }, 2400);
  }

  /** Closes the active product popmenu without changing editor selection. */
  function close(): void {
    active.value = null;
  }

  /**
   * Resolves a menu item's semantic behavior payload.
   *
   * @param item - Product popmenu item.
   * @param detail - Semantic trigger detail.
   * @returns Product behavior payload or undefined.
   */
  function resolvePayload(
    item: ClassicEditorPopmenuItem,
    detail: unknown
  ): unknown {
    const context = model.value.context;
    return context === undefined ? undefined : item.payload?.(detail, context);
  }

  return { active, close, execute, notice, options } as const;
}
