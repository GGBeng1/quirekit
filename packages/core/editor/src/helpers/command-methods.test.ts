import { describe, expect, it, vi } from "vitest";
import type { AnyCommands } from "../types";
import { createQuireCommandMethods } from "./command-methods";

describe("lazy command tables", () => {
  it("binds only the commands a surface uses and keeps method identity", () => {
    const raw = { first: () => () => true, second: () => () => false, third: () => () => true } as unknown as AnyCommands;
    const bind = vi.fn((command: (...args: unknown[]) => unknown) => () => command());
    const table = createQuireCommandMethods(raw, bind);
    expect(bind).not.toHaveBeenCalled();
    expect("second" in table).toBe(true);
    expect(bind).toHaveBeenCalledOnce();
    expect(table.first).toBe(table.first);
    expect(bind).toHaveBeenCalledTimes(2);
    expect(Object.keys(table)).toEqual(["first", "second", "third"]);
    expect(bind).toHaveBeenCalledTimes(3);
    expect(Reflect.get(table, "missing")).toBeUndefined();
  });

  it("keeps deletions and freezing consistent with an ordinary object", () => {
    const raw = { first: () => () => true, second: () => () => false } as unknown as AnyCommands;
    const table = createQuireCommandMethods(raw, (command) => command);
    expect(delete table.first).toBe(true);
    expect(Object.keys(table)).toEqual(["second"]);
    expect("first" in table).toBe(false);
    Object.freeze(table);
    expect(Object.isFrozen(table)).toBe(true);
    expect(table.second).toBe(raw.second);
  });
});
