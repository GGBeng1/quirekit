import { Search } from "@quirekit/extension-search";
import type {} from "@quirekit/view/mounted-services";
import { createClassicSearchActivationService } from "./activation";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorRibbonGroupContribution,
  ClassicEditorWorkspaceWidgetContribution
} from "@classic/types";
import { createClassicEditorRibbonAction } from "../surfaces";
import { classicSearchText } from "./localization";
import { mountClassicSearchProvider } from "./panel";
import { getClassicSearchSession } from "./session";

/** Opens the find panel from the Home ribbon. */
const openSearchAction: ClassicEditorActionDefinition = {
  id: "search.open",
  label: classicSearchText.title,
  icon: "search",
  group: "search",
  order: 191,
  shortcut: { en: "Ctrl+F", "zh-CN": "Ctrl+F" },
  run: ({ editor, ownerDocument }) => getClassicSearchSession(editor).open(editor, "find", ownerDocument)
};

/** Classic find and replace: Home entry, shortcuts, and the unique Workspace Panel. */
export const ClassicEditorSearch = Search.extend({
  /**
   * Opens find on Mod-f and replace on Ctrl-h, as Word does on every platform.
   *
   * @returns Shortcuts that fall through to the browser when no panel host exists.
   */
  addKeyboardShortcuts() {
    // Key handling implies a mounted view, so its document owns the focus to restore.
    const open = (mode: "find" | "replace"): boolean => this.editor !== undefined
      && getClassicSearchSession(this.editor).open(this.editor, mode, this.editor.view.dom.ownerDocument);
    return {
      "Mod-f": () => open("find"),
      "Ctrl-h": () => open("replace")
    };
  },

  /** @returns View service that lets search enter header, footer, and footnote sessions. */
  addMountedViewServices() {
    return [createClassicSearchActivationService()];
  },

  /** @returns Home Editing group. */
  addRibbonGroups() {
    return [{
      kind: "ribbon-group",
      id: "home-editing",
      tabId: "home",
      label: classicSearchText.group,
      order: 190
    }] satisfies readonly ClassicEditorRibbonGroupContribution[];
  },

  /** @returns Find and replace entry. */
  addRibbonItems() {
    return [createClassicEditorRibbonAction("ribbon.search", "home-editing", openSearchAction)];
  },

  /** @returns Renderless provider registering the search panel. */
  addWorkspaceWidgets() {
    return [{
      kind: "workspace-widget",
      id: "workspace.search",
      order: 400,
      mount: mountClassicSearchProvider
    }] satisfies readonly ClassicEditorWorkspaceWidgetContribution[];
  }
});
