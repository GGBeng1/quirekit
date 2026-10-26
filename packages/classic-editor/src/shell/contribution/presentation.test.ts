import { describe, expect, it, vi } from "vitest";
import { createClassicEditorRenderContext } from "../../runtime/contexts";
import { executeClassicEditorAction, resolveClassicEditorActionState } from "../../runtime/ui/action-catalog";
import type { ClassicEditorActionContext, ClassicEditorActionDefinition, ClassicEditorRenderContext } from "../../types";
import { resolveClassicEditorContributionActionState } from "./utils";
import { filterVisibleClassicEditorContributions, selectVisibleClassicEditorContributions } from "./visibility";

/** @returns Mutable test authorities with a production-created presentation context. */
function fixture() {
  const editor = { state: { pm: {} }, isEditable: true };
  const ui = { state: {} };
  const options = {
    editor, ui, instance: { registry: {} }, root: { ownerDocument: {} },
    locale: "en", backend: "canvas", features: {}
  } as unknown as Parameters<typeof createClassicEditorRenderContext>[0];
  const context = createClassicEditorRenderContext(options)!;
  return { editor, ui, context, next: () => createClassicEditorRenderContext(options)! };
}

/** @returns Direct action with observable presentation callbacks. */
function action() {
  return {
    id: "format.bold", label: "Bold", order: 1,
    isAvailable: vi.fn((_context: ClassicEditorActionContext) => true),
    canExecute: vi.fn((_context: ClassicEditorActionContext) => true),
    isActive: vi.fn((_context: ClassicEditorActionContext) => false), run: vi.fn(() => true)
  } satisfies ClassicEditorActionDefinition;
}

describe("Classic presentation query ownership", () => {
  it("shares presentation state only for the same action and occurrence", () => {
    const { context } = fixture();
    const definition = action(), contribution = { action: definition };
    const payload = {}, detail = {};
    const first = resolveClassicEditorContributionActionState(contribution, context, payload, "ribbon", detail);
    expect(resolveClassicEditorContributionActionState(contribution, context, payload, "ribbon", detail)).toBe(first);
    expect(definition.canExecute).toHaveBeenCalledTimes(1);
    resolveClassicEditorContributionActionState(contribution, context, payload, "toolbar", detail);
    resolveClassicEditorContributionActionState(contribution, context, {}, "ribbon", detail);
    resolveClassicEditorContributionActionState(contribution, context, payload, "ribbon", {});
    expect(definition.canExecute).toHaveBeenCalledTimes(4);
  });

  it("invalidates on PM, UI, editability and explicit refresh even with stable document inputs", () => {
    const { editor, ui, context, next } = fixture();
    const definition = action();
    const read = (current = context) => resolveClassicEditorContributionActionState({ action: definition }, current, undefined, "toolbar");
    read(); read();
    editor.state.pm = {}; read();
    ui.state = {}; read();
    editor.isEditable = false; read();
    read(next());
    expect(definition.canExecute).toHaveBeenCalledTimes(5);
  });

  it("does not memoize public queries or unknown caller-created contexts", () => {
    const { context } = fixture();
    const definition = action();
    const unknown = { ...context } as ClassicEditorRenderContext;
    resolveClassicEditorContributionActionState({ action: definition }, unknown, undefined, "toolbar");
    resolveClassicEditorContributionActionState({ action: definition }, unknown, undefined, "toolbar");
    resolveClassicEditorActionState(definition, context, undefined, "toolbar");
    resolveClassicEditorActionState(definition, context, undefined, "toolbar");
    expect(definition.canExecute).toHaveBeenCalledTimes(4);
    expect(definition.isAvailable.mock.calls[0]?.[0]).toBe(definition.canExecute.mock.calls[0]?.[0]);
  });

  it("revalidates live permissions when executing a cached presentation", async () => {
    const { context } = fixture();
    const definition = action();
    expect(resolveClassicEditorContributionActionState({ action: definition }, context, undefined, "toolbar").canExecute).toBe(true);
    definition.canExecute.mockReturnValue(false);
    await expect(executeClassicEditorAction(definition, context, undefined, "toolbar")).resolves.toBe(false);
    expect(definition.run).not.toHaveBeenCalled();
    expect(definition.canExecute).toHaveBeenCalledTimes(2);
  });

  it("filters visibility once without evaluating disabled or active state", () => {
    const { context, next } = fixture();
    const definition = action();
    const when = vi.fn(() => true);
    const entries = [{ kind: "toolbar-action-control" as const, id: "bold", label: "Bold", action: definition, when }];
    const first = filterVisibleClassicEditorContributions(entries, context);
    expect(first).toEqual(entries);
    expect(filterVisibleClassicEditorContributions(entries, context)).toBe(first);
    expect(when).toHaveBeenCalledTimes(1);
    expect(definition.isAvailable).toHaveBeenCalledTimes(1);
    expect(definition.canExecute).not.toHaveBeenCalled();
    expect(definition.isActive).not.toHaveBeenCalled();
    resolveClassicEditorContributionActionState(entries[0]!, context, undefined, "toolbar");
    expect(definition.isAvailable).toHaveBeenCalledTimes(1);
    when.mockReturnValue(false);
    expect(filterVisibleClassicEditorContributions(entries, next())).toEqual([]);
  });

  it("keeps unrelated family predicates cold and shares a later full-directory query", () => {
    const { context } = fixture();
    const toolbarWhen = vi.fn(() => true), statusWhen = vi.fn(() => true);
    const entries = [
      { kind: "toolbar-action-control" as const, id: "bold", label: "Bold", action: action(), when: toolbarWhen },
      { kind: "status-item" as const, id: "status", render: () => null, when: statusWhen }
    ];
    expect(selectVisibleClassicEditorContributions(entries, context, "status-item").map(item => item.id)).toEqual(["status"]);
    expect(toolbarWhen).not.toHaveBeenCalled();
    filterVisibleClassicEditorContributions(entries, context);
    expect(statusWhen).toHaveBeenCalledTimes(1);
    expect(toolbarWhen).toHaveBeenCalledTimes(1);
  });
});
