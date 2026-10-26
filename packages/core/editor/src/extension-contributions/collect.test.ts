import { describe, expect, it } from "vitest";
import { Extension } from "../extension";
import { Mark } from "../Mark";
import { Node } from "../Node";
import type {
  QuireExtensionConfig,
  QuireExtensionThisContext,
  QuireMarkConfig,
  QuireNodeConfig
} from "../types";
import { collectQuireExtensionContributions } from "./collect";

describe("collectQuireExtensionContributions", () => {
  it("collects separate hooks from extension, node, and mark configs in input order", () => {
    const extension = Extension.create<{ label: string }, { enabled: boolean }>({
      name: "example.behavior",
      addOptions: () => ({ label: "Behavior" }),
      addStorage: () => ({ enabled: true }),
      addToolbarItems(this: QuireExtensionThisContext<
        { label: string },
        { enabled: boolean }
      >) {
        return [{ id: `${this.name}:${this.options.label}` }];
      }
    } as QuireExtensionConfig<{ label: string }, { enabled: boolean }>);
    const node = Node.create({
      name: "exampleNode",
      group: "block",
      addToolbarItems(this: QuireExtensionThisContext) {
        return [{ id: this.name }];
      }
    } as QuireNodeConfig);
    const mark = Mark.create({
      name: "exampleMark",
      addToolbarItems(this: QuireExtensionThisContext) {
        return [{ id: this.name }];
      }
    } as QuireMarkConfig);

    expect(collectQuireExtensionContributions<{ id: string }>(
      [extension, node, mark],
      "addToolbarItems"
    ).map(({ extensionName, contribution }) => ({
      extensionName,
      id: contribution.id
    }))).toEqual([
      { extensionName: "example.behavior", id: "example.behavior:Behavior" },
      { extensionName: "exampleNode", id: "exampleNode" },
      { extensionName: "exampleMark", id: "exampleMark" }
    ]);
  });

  it("honors configured options and inherited hook factories", () => {
    const base = Extension.create<{ label: string }>({
      name: "example.inherited",
      addOptions: () => ({ label: "base" }),
      addToolbarItems(this: QuireExtensionThisContext<{ label: string }>) {
        return [{ id: `${this.name}:${this.options.label}` }];
      }
    } as QuireExtensionConfig<{ label: string }>);
    const configured = base.configure({ label: "configured" });

    expect(collectQuireExtensionContributions<{ id: string }>(
      [configured],
      "addToolbarItems"
    )[0]?.contribution.id).toBe("example.inherited:configured");
  });

  it("rejects non-factory hooks and non-array factory results", () => {
    const staticHook = Extension.create({
      name: "example.static",
      addToolbarItems: []
    } as QuireExtensionConfig);
    const invalidResult = Extension.create({
      name: "example.invalid-result",
      addToolbarItems: () => ({ id: "not-an-array" })
    } as QuireExtensionConfig);

    expect(() => collectQuireExtensionContributions(
      [staticHook],
      "addToolbarItems"
    )).toThrowError(/must be a function/u);
    expect(() => collectQuireExtensionContributions(
      [invalidResult],
      "addToolbarItems"
    )).toThrowError(/must return an array/u);
  });
});
