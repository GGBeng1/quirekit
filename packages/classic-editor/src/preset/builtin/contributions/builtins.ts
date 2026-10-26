import type { ClassicEditorContribution } from "@classic/types";
import {
  classicEditorObjectWorkspaceContribution
} from "@classic/shell/contribution/object-workspace";
import { builtinClassicEditorChromeContributions } from "./chrome";
import { builtinClassicEditorMenuContributions } from "./menus";
import { builtinClassicEditorRibbonContributions } from "./ribbon";

/** Default product contributions grouped by independent product surfaces. */
export const builtinClassicEditorContributions: readonly ClassicEditorContribution[] =
  Object.freeze([
    ...builtinClassicEditorMenuContributions,
    ...builtinClassicEditorRibbonContributions,
    ...builtinClassicEditorChromeContributions,
    classicEditorObjectWorkspaceContribution
  ]);
