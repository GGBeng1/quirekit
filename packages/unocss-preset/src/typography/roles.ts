import type { StaticShortcut, UserShortcuts } from "@unocss/core";
import { themeVariableReferences } from "@quirekit/ui";
import { inlineCodeDeclarations, typographyDeclarations } from "./declarations";

/** Complete text roles; color and element semantics stay with the consumer. */
export const typographyShortcuts = [
  ["qk-typography--inline-code", [inlineCodeDeclarations], { layer: "qk-recipes" }],
  ...Object.entries(themeVariableReferences.typography)
  .map(([name, role]): StaticShortcut => [
    `qk-type-${name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)}`,
    [typographyDeclarations(role, name === "code")],
    { layer: "qk-recipes" }
  ])
] satisfies UserShortcuts;

/** All roles are published for both UnoCSS and standalone CSS consumers. */
export const typographyRecipeCatalog = Object.freeze(
  typographyShortcuts.map(([name]) => name)
);
