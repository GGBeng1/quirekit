import { describe, expect, it, vi } from "vitest";
import type { CanvasPageContentVersionParts } from "./types";
import { CanvasPageContentVersionRegistry, hashCanvasPageContentText } from "./version-registry";

/**
 * @param commands - Serialized command signatures.
 * @param overrides - Parts to replace.
 * @returns Version parts hashing each command string.
 */
function parts(
  commands: readonly string[],
  overrides: Partial<CanvasPageContentVersionParts> = {}
): CanvasPageContentVersionParts {
  return {
    scalars: "chunk:page:0|page:0|rect:0,0,100,100|dpr:2|canvas:200x200|painter:none",
    ownerKeys: ["owner:a", "owner:b"],
    commandCount: commands.length,
    readCommand: (index) => commands[index]!,
    readCommandHash: (index) => hashCanvasPageContentText(commands[index]!),
    ...overrides
  };
}

describe("page content version registry", () => {
  it("returns one id for equal content, including equal strings built separately", () => {
    const registry = new CanvasPageContentVersionRegistry(8, () => undefined);
    const first = registry.resolve(parts(['{"kind":"text","text":"a"}', '{"kind":"line"}']));
    const rebuilt = ['{"kind":"text","text":', '"a"}'].join("");
    expect(registry.resolve(parts([rebuilt, '{"kind":"line"}']))).toBe(first);
  });

  it("returns a new id when any compared part changes", () => {
    const registry = new CanvasPageContentVersionRegistry(16, () => undefined);
    const commands = ["{\"a\":1}", "{\"b\":2}"];
    const base = registry.resolve(parts(commands));
    const variants = [
      parts(commands, { scalars: "chunk:page:0|page:0|rect:0,0,100,100|dpr:3|canvas:300x300|painter:none" }),
      parts(commands, { ownerKeys: ["owner:b", "owner:a"] }),
      parts(commands, { ownerKeys: ["owner:a"] }),
      parts(["{\"a\":1}"]),
      parts(["{\"a\":1}", "{\"b\":3}"])
    ];
    const ids = variants.map((variant) => registry.resolve(variant));
    expect(new Set([base, ...ids]).size).toBe(variants.length + 1);
  });

  it("separates different content whose hashes collide", () => {
    const registry = new CanvasPageContentVersionRegistry(8, () => undefined);
    const colliding = (commands: readonly string[]) => parts(commands, { readCommandHash: () => 0 });
    const first = registry.resolve(colliding(["{\"a\":1}"]));
    const second = registry.resolve(colliding(["{\"a\":2}"]));
    expect(second).not.toBe(first);
    expect(registry.resolve(colliding(["{\"a\":1}"]))).toBe(first);
  });

  it("evicts least recently used versions and never reuses their ids", () => {
    const onEvict = vi.fn();
    const registry = new CanvasPageContentVersionRegistry(2, onEvict);
    const a = registry.resolve(parts(["a"]));
    const b = registry.resolve(parts(["b"]));
    expect(registry.resolve(parts(["a"]))).toBe(a);
    const c = registry.resolve(parts(["c"]));

    expect(onEvict).toHaveBeenCalledExactlyOnceWith(b);
    expect(registry.resolve(parts(["a"]))).toBe(a);
    const bAgain = registry.resolve(parts(["b"]));
    expect([a, b, c]).not.toContain(bAgain);
  });
});
