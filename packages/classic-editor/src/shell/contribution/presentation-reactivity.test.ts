import { computed, nextTick, ref } from "vue";
import { describe, expect, it } from "vitest";
import { createClassicEditorRenderContext } from "../../runtime/contexts";
import { resolveClassicEditorActionState } from "../../runtime/ui/action-catalog";
import { readClassicEditorPresentationValue } from "../../runtime/ui/presentation/scope";
import type { ClassicEditorActionDefinition } from "../../types";
import { resolveClassicEditorContributionActionState } from "./utils";
import { filterVisibleClassicEditorContributions } from "./visibility";

describe("Classic presentation callback reactivity", () => {
  it("tracks visibility refs after a synchronous shell query warms the context", async () => {
    const context = createContext();
    const allowed = ref(true);
    const entries = [{
      kind: "status-item" as const,
      id: "permission-status",
      render: () => null,
      when: () => allowed.value
    }];

    // The shell's imperative render runs before a Vue consumer tracks queries.
    expect(filterVisibleClassicEditorContributions(entries, context)).toHaveLength(1);
    const visible = computed(() => filterVisibleClassicEditorContributions(entries, context));
    const previousBehavior = computed(() => entries.filter((entry) => entry.when()));
    expect(visible.value).toHaveLength(1);
    expect(previousBehavior.value).toHaveLength(1);

    allowed.value = false;
    await nextTick();

    expect(previousBehavior.value).toHaveLength(0);
    expect(visible.value).toHaveLength(0);
  });

  it("tracks action permission refs after a synchronous presentation query", async () => {
    const context = createContext();
    const allowed = ref(true);
    const action = {
      id: "permission-action",
      label: "Permission action",
      order: 1,
      canExecute: () => allowed.value,
      run: () => true
    } satisfies ClassicEditorActionDefinition;
    const contribution = { action };

    expect(resolveClassicEditorContributionActionState(
      contribution, context, undefined, "toolbar"
    ).canExecute).toBe(true);
    const state = computed(() => resolveClassicEditorContributionActionState(
      contribution, context, undefined, "toolbar"
    ));
    const previousBehavior = computed(() => resolveClassicEditorActionState(
      action, context, undefined, "toolbar"
    ));
    expect(state.value.canExecute).toBe(true);
    expect(previousBehavior.value.canExecute).toBe(true);

    allowed.value = false;
    await nextTick();

    expect(previousBehavior.value.canExecute).toBe(false);
    expect(state.value.canExecute).toBe(false);
  });

  it("retries a failed initial query without requiring an authority change", () => {
    const context = createContext();
    const key = Symbol("initial-failure");
    let attempts = 0;
    const query = () => {
      if (++attempts === 1) throw new Error("temporary initial failure");
      return "ready";
    };

    expect(() => readClassicEditorPresentationValue(context, [key], query))
      .toThrow("temporary initial failure");
    expect(readClassicEditorPresentationValue(context, [key], query)).toBe("ready");
    expect(attempts).toBe(2);
  });

  it("retries a failed reactive refresh instead of reusing an obsolete value", () => {
    const context = createContext();
    const key = Symbol("refresh-failure");
    const revision = ref(1);
    let failOnce = true;
    const query = () => {
      const current = revision.value;
      if (current === 2 && failOnce) {
        failOnce = false;
        throw new Error("temporary refresh failure");
      }
      return current;
    };

    expect(readClassicEditorPresentationValue(context, [key], query)).toBe(1);
    revision.value = 2;
    expect(() => readClassicEditorPresentationValue(context, [key], query))
      .toThrow("temporary refresh failure");
    expect(readClassicEditorPresentationValue(context, [key], query)).toBe(2);
  });

  it("retries nested availability after a full action state refresh throws", () => {
    const context = createContext();
    const allowed = ref(true);
    let availabilityCalls = 0;
    let enabledCalls = 0;
    let failOnce = true;
    const action = {
      id: "nested-permission-action",
      label: "Nested permission action",
      order: 1,
      isAvailable: () => {
        availabilityCalls += 1;
        const current = allowed.value;
        if (!current && failOnce) {
          failOnce = false;
          throw new Error("temporary availability failure");
        }
        return current;
      },
      canExecute: () => { enabledCalls += 1; return true; },
      run: () => true
    } satisfies ClassicEditorActionDefinition;
    const read = () => resolveClassicEditorContributionActionState(
      { action }, context, undefined, "toolbar"
    );

    expect(read().available).toBe(true);
    allowed.value = false;
    // Vue can refresh availability while checking the full state's dependencies,
    // before entering that state's getter or the nested scope reader again.
    expect(read).toThrow("temporary availability failure");
    expect(read()).toEqual({
      available: false, canExecute: false, active: false, reason: null
    });
    expect(availabilityCalls).toBe(3);
    expect(enabledCalls).toBe(1);
  });
});

/** @returns A runtime-owned context whose non-Vue authorities remain unchanged. */
function createContext() {
  return createClassicEditorRenderContext({
    editor: { state: { pm: {} }, isEditable: true },
    ui: { state: {} },
    instance: { registry: {} },
    root: { ownerDocument: {} },
    locale: "en",
    backend: "canvas",
    features: {}
  } as unknown as Parameters<typeof createClassicEditorRenderContext>[0])!;
}
