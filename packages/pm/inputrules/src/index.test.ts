import type * as PMInputRules from "./index";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/index.mjs";
const { InputRule, inputRules } = (await import(distEntry)) as typeof PMInputRules;

describe("pm-inputrules vendored API", () => {
  it("creates input rules and plugin props", () => {
    const rule = new InputRule(/--$/, "—");
    const plugin = inputRules({ rules: [rule] });

    expect(rule.match.exec("hello --")?.[0]).toBe("--");
    expect(plugin.spec.props?.handleTextInput).toBeTypeOf("function");
  });
});
