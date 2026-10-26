import { describe, expect, it, vi } from "vitest";
import { QuireCommandManager } from "./CommandManager";
import { createEditor } from "./Editor";
import type { CommandProps } from "./types";

describe("command surface construction compatibility", () => {
  it.each(["single", "can", "chain", "nested"] as const)(
    "preserves own data properties, detached methods and factory snapshots for %s",
    (mode) => {
      const editor = createEditor();
      const manager = new QuireCommandManager({ editor });
      const original = vi.fn(() => () => false);
      Object.defineProperty(manager.rawCommands, "__proto__", {
        value: original, enumerable: true, configurable: true, writable: true
      });
      Object.setPrototypeOf(manager.rawCommands, { inheritedCommand: original });
      Object.defineProperty(manager.rawCommands, "hiddenCommand", { value: original });
      Reflect.set(manager.rawCommands, Symbol.iterator, original);
      const names = Object.keys(manager.rawCommands);
      const surface = mode === "single" ? manager.commands
        : mode === "can" ? manager.createCan()
        : mode === "chain" ? manager.createChain()
        : manager.buildProps(manager.state.tr, false).commands;
      const expectedNames = mode === "can" ? [...names, "chain"]
        : mode === "chain" ? [...names, "run"] : names;

      expect(Object.keys(surface)).toEqual(expectedNames);
      expect(Reflect.ownKeys(surface)).toEqual(expectedNames);
      expect(Object.getPrototypeOf(surface)).toBe(Object.prototype);
      expect(Reflect.get(surface, "missingCommand")).toBeUndefined();
      expect(Object.hasOwn(surface, "inheritedCommand")).toBe(false);
      expect(Object.hasOwn(surface, "hiddenCommand")).toBe(false);
      expect(Reflect.get(surface, "then")).toBeUndefined();
      expect(Reflect.get(surface, Symbol.iterator)).toBeUndefined();
      const detached = Reflect.get(surface, "__proto__");
      expect(Object.getOwnPropertyDescriptor(surface, "__proto__")).toEqual({
        value: detached, enumerable: true, configurable: true, writable: true
      });
      expect(Reflect.get(surface, "__proto__")).toBe(detached);

      // A retained table owns its factory; the next table sees the live registry.
      const replacement = vi.fn(() => () => true);
      manager.rawCommands.__proto__ = replacement;
      expect(detached()).toBe(mode === "chain" ? surface : false);
      expect(original).toHaveBeenCalledOnce();
      expect(replacement).not.toHaveBeenCalled();
      expect(Reflect.get(manager.createCan(), "__proto__")()).toBe(true);
      expect(replacement).toHaveBeenCalledOnce();
      manager.rawCommands.newCommand = () => () => true;
      expect(Object.hasOwn(manager.createCan(), "newCommand")).toBe(true);
      delete manager.rawCommands.newCommand;
      expect(Object.hasOwn(manager.createCan(), "newCommand")).toBe(false);
      Object.freeze(surface);
      expect(Reflect.get(surface, "__proto__")).toBe(detached);
      editor.destroy();
    }
  );

  it("dispatches false-returning single commands and preserves suppression/custom state", () => {
    const editor = createEditor();
    const dispatch = vi.spyOn(editor.view, "dispatch");
    expect(editor.commands.command(({ tr }: CommandProps) => {
      tr.insertText("kept");
      return false;
    })).toBe(false);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(editor.state.doc.textContent).toBe("kept");
    expect(editor.commands.command(({ tr }: CommandProps) => {
      tr.insertText("hidden").setMeta("preventDispatch", true);
      return true;
    })).toBe(true);
    const isolated = new QuireCommandManager({ editor, state: editor.state.pm });
    expect(isolated.commands.command(({ tr }: CommandProps) => {
      tr.insertText("custom");
      return true;
    })).toBe(true);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(editor.state.doc.textContent).toBe("kept");
    editor.destroy();
  });

  it("shares chain/nested transactions and overrides raw run/chain entries", () => {
    const editor = createEditor();
    const manager = new QuireCommandManager({ editor });
    const collision = vi.fn(() => () => false);
    manager.rawCommands.chain = collision;
    manager.rawCommands.run = collision;
    const dispatch = vi.spyOn(editor.view, "dispatch");
    const chain = manager.createChain();
    expect(chain.command(({ commands }: CommandProps) => commands.command(({ tr }: CommandProps) => {
      tr.insertText("shared");
      return false;
    }))).toBe(chain);
    chain.command(({ tr, state }: CommandProps) => {
      expect(state.tr).toBe(tr);
      expect(state.doc.textContent).toBe("shared");
      return true;
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(chain.run()).toBe(false);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(editor.state.doc.textContent).toBe("shared");
    expect(manager.createCan().chain().command(() => true).run()).toBe(true);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(collision).not.toHaveBeenCalled();
    editor.destroy();
  });
});
