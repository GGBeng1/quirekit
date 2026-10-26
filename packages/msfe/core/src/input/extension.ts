import { Prec, type Extension } from "@quirekit/cm-state";
import { keymap } from "@quirekit/cm-view";
import { commandKeyBinding } from "../commands/keys";
import { blockInputRegistry, compileBlockInput } from "./registry";
import { planBlockInput } from "./routing";
import type { BlockInputRule } from "./types";

/** @param rules - Installed block owners. @returns One shared keymap and static registry, absent when unused. */
export function blockInputExtension(rules: readonly BlockInputRule[]): Extension {
  if (!rules.length) return [];
  return [blockInputRegistry.of(compileBlockInput(rules)), Prec.highest(keymap.of([
    commandKeyBinding("Enter", state => planBlockInput(state, "enter")),
    commandKeyBinding("Shift-Enter", state => planBlockInput(state, "lineBreak")),
    commandKeyBinding("Mod-Enter", state => planBlockInput(state, "exit")),
  ]))];
}
