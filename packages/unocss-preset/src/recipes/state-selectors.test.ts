import { createGenerator } from "@unocss/core";
import { presetWind3, type Theme } from "@unocss/preset-wind3";
import { expect, it } from "vitest";
import { quireKitUnoTheme } from "../theme/bridge";
import { checkboxShortcuts } from "./checkbox";
import { switchShortcuts } from "./switch";
import { radioGroupShortcuts } from "./radio-group";
import { tagsInputShortcuts } from "./tags-input";
import { fileUploadShortcuts } from "./file-upload";

const cases = [
  // Invalid feedback must preserve disabled styling, including when both states coexist.
  ["qk-checkbox--invalid", ".qk-checkbox--invalid .qk-checkbox__control:not([data-disabled])", "border-color:var(--qk-color-danger-border)"],
  ["qk-switch--invalid", ".qk-switch--invalid .qk-switch__control", "border-color:var(--qk-color-danger-border)"],
  ["qk-radio-group--invalid", ".qk-radio-group--invalid .qk-radio-group__control:not([data-disabled])", "border-color:var(--qk-color-danger-border)"],
  ["qk-tags-input--invalid", ".qk-tags-input--invalid .qk-tags-input__control", "border-color:var(--qk-color-danger-border)"],
  ["qk-file-upload--invalid", ".qk-file-upload--invalid .qk-file-upload__dropzone", "border-color:var(--qk-color-danger-border)"],
  ["qk-checkbox--disabled", ".qk-checkbox--disabled .qk-checkbox__description", "color:var(--qk-color-text-disabled)"],
  ["qk-switch--disabled", ".qk-switch--disabled .qk-switch__description", "color:var(--qk-color-text-disabled)"],
  // A label-only switch centers in its control height; a described one aligns the track with the first line.
  ["qk-switch", ".qk-switch", "align-items:center"],
  ["qk-switch--described", ".qk-switch--described", "align-items:flex-start"],
  ["qk-switch--described", ".qk-switch--described .qk-switch__control", "margin-top:0.125rem"],
  ["qk-radio-group--disabled", ".qk-radio-group--disabled .qk-radio-group__description", "color:var(--qk-color-text-disabled)"],
  ["qk-radio-group__item", ".qk-radio-group__item[data-disabled] .qk-radio-group__description", "color:var(--qk-color-text-disabled)"]
] as const;

it.each(cases)("applies %s feedback to the actual descendant anatomy", async (token, selector, declaration) => {
  const generator = await createGenerator<Theme>({
    presets: [presetWind3()], theme: quireKitUnoTheme,
    shortcuts: [...checkboxShortcuts, ...switchShortcuts, ...radioGroupShortcuts, ...tagsInputShortcuts, ...fileUploadShortcuts]
  });
  const { css, matched } = await generator.generate(token);
  expect(matched.has(token)).toBe(true);
  // Matching a utility alone is insufficient: its state rule must still address
  // the public BEM class, and the semantic declaration must belong to that rule.
  const rule = css.split("}").find(block => block.slice(0, block.lastIndexOf("{")).trim().endsWith(selector));
  expect(rule, css).toBeDefined();
  expect(rule?.slice(rule.lastIndexOf("{") + 1)).toContain(declaration);
});
