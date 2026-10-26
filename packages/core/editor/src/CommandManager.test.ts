import { describe, expect, it, vi } from "vitest";
import { QuireCommandManager } from "./CommandManager";
import { createEditor } from "./Editor";
import type { CommandProps } from "./types";

describe("command capability checks", () => {
  it("does not construct nested command helpers for a probe that never reads them", () => {
    const editor = createEditor();
    const initialState = editor.state.pm;
    const dispatch = vi.spyOn(editor.view, "dispatch");
    const manager = new QuireCommandManager({ editor });
    const buildProps = vi.spyOn(manager, "buildProps");
    const can = manager.createCan();
    const props = buildProps.mock.results[0]!.value as CommandProps;
    const nestedCommands = vi.spyOn(props, "commands", "get");

    expect(can.command(({ dispatch: probeDispatch }: CommandProps) => probeDispatch === undefined)).toBe(true);
    expect(can.command(() => false)).toBe(false);

    expect(nestedCommands).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(editor.state.pm).toBe(initialState);
    editor.destroy();
  });

  it("resolves explicit nested commands on the shared non-dispatching transaction", () => {
    const editor = createEditor();
    const initialState = editor.state.pm;
    const dispatch = vi.spyOn(editor.view, "dispatch");
    const manager = new QuireCommandManager({ editor });
    const buildProps = vi.spyOn(manager, "buildProps");
    const can = manager.createCan();
    const props = buildProps.mock.results[0]!.value as CommandProps;
    const nestedCommands = vi.spyOn(props, "commands", "get");
    const observedProps: CommandProps[] = [];

    expect(can.command((outer: CommandProps) => {
      observedProps.push(outer);
      return outer.commands.command((inner: CommandProps) => {
        observedProps.push(inner);
        inner.tr.insertText("isolated");
        return inner.dispatch === undefined;
      });
    })).toBe(true);

    expect(nestedCommands).toHaveBeenCalledTimes(1);
    expect(observedProps.map(({ tr }) => tr)).toEqual([props.tr, props.tr]);
    expect(observedProps.every(({ dispatch: probeDispatch }) => probeDispatch === undefined)).toBe(true);
    expect(props.tr.doc.textContent).toBe("isolated");
    expect(dispatch).not.toHaveBeenCalled();
    expect(editor.state.pm).toBe(initialState);
    expect(editor.state.doc.textContent).toBe("");
    editor.destroy();
  });

  it("keeps can chains isolated while later callbacks observe the shared transaction", () => {
    const editor = createEditor();
    const initialState = editor.state.pm;
    const dispatch = vi.spyOn(editor.view, "dispatch");

    expect(editor.can().chain()
      .command(({ tr, dispatch: probeDispatch }: CommandProps) => {
        tr.insertText("draft");
        return probeDispatch === undefined;
      })
      .command(({ state, tr, dispatch: probeDispatch }: CommandProps) => (
        state.tr === tr
        && state.doc.textContent === "draft"
        && probeDispatch === undefined
      ))
      .run()).toBe(true);
    expect(editor.can().chain().command(() => false).run()).toBe(false);

    expect(dispatch).not.toHaveBeenCalled();
    expect(editor.state.pm).toBe(initialState);
    expect(editor.state.doc.textContent).toBe("");
    editor.destroy();
  });
});
