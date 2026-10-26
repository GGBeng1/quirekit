import { Subscript, Superscript } from "@quirekit/extension-text-style";
import { getBuiltinClassicEditorText } from "../../localization";
import type { ClassicEditorActionDefinition } from "../../types";
import {
  createClassicEditorRibbonAction,
  createClassicEditorSelectionPopupAction
} from "../surfaces";

const superscriptAction: ClassicEditorActionDefinition = {
  id: "format.superscript",
  label: getBuiltinClassicEditorText("superscript"),
  icon: "superscript",
  group: "formatting",
  order: 124.1,
  run: ({ editor }) => editor.commands.toggleSuperscript(),
  canExecute: ({ editor }) => editor.isEditable && editor.can().toggleSuperscript(),
  isActive: ({ editor }) => editor.isActive("superscript")
};
const subscriptAction: ClassicEditorActionDefinition = {
  id: "format.subscript",
  label: getBuiltinClassicEditorText("subscript"),
  icon: "subscript",
  group: "formatting",
  order: 124.2,
  run: ({ editor }) => editor.commands.toggleSubscript(),
  canExecute: ({ editor }) => editor.isEditable && editor.can().toggleSubscript(),
  isActive: ({ editor }) => editor.isActive("subscript")
};

/** Superscript semantics and shortcuts with shared Classic action surfaces. */
export const ClassicEditorSuperscript = Superscript.extend({
  /** @returns Superscript control beside the other character formats. */
  addRibbonItems() {
    return [createClassicEditorRibbonAction("ribbon.superscript", "home-format", superscriptAction)];
  },
  /** @returns The same superscript action for selected text. */
  addSelectionPopupItems() {
    return [{ ...createClassicEditorSelectionPopupAction("selection.superscript", superscriptAction), placement: "secondary" as const }];
  }
});

/** Subscript semantics and shortcuts with shared Classic action surfaces. */
export const ClassicEditorSubscript = Subscript.extend({
  /** @returns Subscript control beside superscript. */
  addRibbonItems() {
    return [createClassicEditorRibbonAction("ribbon.subscript", "home-format", subscriptAction)];
  },
  /** @returns The same subscript action for selected text. */
  addSelectionPopupItems() {
    return [{ ...createClassicEditorSelectionPopupAction("selection.subscript", subscriptAction), placement: "secondary" as const }];
  }
});
