import { expect, it } from "vitest";
import { createTheme } from "../../theme";
import { createKbdTokens, createKbdCssVariables } from "./index";

it("keeps keycaps on the code font and stays independent of host density and follows semantic typography", () => {
  const base = createTheme();
  const theme = { ...base, control: { ...base.control, default: "36px" }, spacing: { ...base.spacing, inlineTight: "5px", inline: "7px" },
    typography: { ...base.typography, code: { ...base.typography.code, fontFamily: '"Test Mono", monospace' } } };
  const css = createKbdCssVariables(createKbdTokens(theme));
  expect(css["--qk-kbd-font-family"]).toBe('"Test Mono", monospace');
  expect(css["--qk-kbd-sm-min-height"]).toBe("calc(14px * 1.5714)");
  expect(css["--qk-kbd-xs-padding-inline"]).toBe("5px");
  expect(css["--qk-kbd-sm-padding-inline"]).toBe("7px");
  expect(css["--qk-kbd-md-padding-inline"]).toBe("calc(7px + 5px / 2)");
  expect(Object.keys(createKbdTokens(base).size)).toEqual(["xs", "sm", "md"]);
});
