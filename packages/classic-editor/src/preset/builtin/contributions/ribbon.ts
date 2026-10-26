import { getBuiltinClassicEditorText } from "@classic/localization";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorContribution
} from "@classic/types";
import { createClassicEditorRibbonAction } from "../../../extensions/surfaces";
import { builtinClassicEditorPanelIds } from "../ids";

const copy = getBuiltinClassicEditorText;
const toggleOutlineAction: ClassicEditorActionDefinition = {
  id: "view.toggle-outline",
  label: copy("outline"),
  icon: "listTree",
  order: 311,
  canExecute: () => true,
  isActive: ({ ui }) => ui.state.leftSidebar.visible,
  run: ({ ui }) => {
    ui.toggleSidebar("left");
    return true;
  }
};
const openDocumentPropertiesAction: ClassicEditorActionDefinition = {
  id: "view.open-document-properties",
  label: copy("documentProperties"),
  icon: "slidersHorizontal",
  order: 312,
  canExecute: () => true,
  isActive: ({ ui }) => ui.state.rightSidebar.visible
    && ui.state.rightSidebar.activePanelId
      === builtinClassicEditorPanelIds.documentProperties,
  run: ({ ui }) => {
    ui.openSidebarPanel("right", builtinClassicEditorPanelIds.documentProperties);
    return true;
  }
};
const toggleRulerAction: ClassicEditorActionDefinition = {
  id: "view.toggle-ruler",
  label: copy("ruler"),
  icon: "ruler",
  order: 313,
  canExecute: () => true,
  isActive: ({ ui }) => ui.state.rulerVisible,
  run: ({ ui }) => {
    ui.setRulerVisible(!ui.state.rulerVisible);
    return true;
  }
};

const toggleInvisibleCharactersAction: ClassicEditorActionDefinition = {
  id: "view.toggle-invisible-characters",
  label: copy("invisibleCharacters"),
  icon: "paragraph",
  order: 314,
  canExecute: () => true,
  isActive: ({ ui }) => ui.state.invisibleCharactersVisible,
  run: ({ ui }) => {
    ui.setInvisibleCharactersVisible(!ui.state.invisibleCharactersVisible);
    return true;
  }
};

const toggleHiddenTextAction: ClassicEditorActionDefinition = {
  id: "view.toggle-hidden-text",
  label: copy("hiddenText"),
  icon: "eye",
  order: 315,
  canExecute: () => true,
  isActive: ({ ui }) => ui.state.hiddenTextVisible,
  run: ({ ui }) => {
    ui.setHiddenTextVisible(!ui.state.hiddenTextVisible);
    return true;
  }
};

/** Built-in ribbon tabs, groups, and compact command controls. */
export const builtinClassicEditorRibbonContributions:
readonly ClassicEditorContribution[] = Object.freeze([
  { ...createClassicEditorRibbonAction("ribbon.hidden-text", "view-panels", toggleHiddenTextAction),
    presentation: "icon-label", interaction: "toggle" },
  { ...createClassicEditorRibbonAction("ribbon.invisible-characters", "view-panels", toggleInvisibleCharactersAction),
    presentation: "icon-label", interaction: "toggle" },
  { kind: "ribbon-tab", id: "home", label: copy("home"), order: 100 },
  { kind: "ribbon-tab", id: "insert", label: copy("insert"), order: 200 },
  { kind: "ribbon-tab", id: "view", label: copy("view"), order: 300 },
  {
    kind: "ribbon-group",
    id: "home-history",
    tabId: "home",
    label: copy("history"),
    order: 110
  },
  {
    kind: "ribbon-group",
    id: "insert-content",
    tabId: "insert",
    label: copy("insert"),
    order: 210
  },
  {
    kind: "ribbon-group",
    id: "insert-graphics",
    tabId: "insert",
    label: copy("graphics"),
    icon: "pencilRuler",
    presentation: "menu",
    order: 225
  },
  {
    kind: "ribbon-group",
    id: "view-panels",
    tabId: "view",
    label: copy("panels"),
    order: 310
  },
  { interaction: "disclosure", presentation: "icon-label", ...createClassicEditorRibbonAction(
    "ribbon.outline",
    "view-panels",
    toggleOutlineAction
  ) },
  { interaction: "disclosure", presentation: "icon-label", ...createClassicEditorRibbonAction(
    "ribbon.properties",
    "view-panels",
    openDocumentPropertiesAction
  ) },
  {
    ...createClassicEditorRibbonAction("ribbon.ruler", "view-panels", toggleRulerAction),
    presentation: "icon-label",
    interaction: "toggle",
    when: ({ instance }) => instance.registry.contributions.some(contribution => contribution.kind === "ruler")
  }
]);
