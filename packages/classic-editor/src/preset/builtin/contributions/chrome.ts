import { getBuiltinClassicEditorText } from "@classic/localization";
import type { ClassicEditorContribution } from "@classic/types";
import { builtinClassicEditorPanelIds } from "../ids";
import {
  renderBuiltinEngineStatus,
  renderBuiltinOutline,
  renderBuiltinProperties,
  renderBuiltinSelection
} from "../panels";
import { renderBuiltinWordCount } from "../word-count";
import { renderBuiltinGlobalSettings } from "../global-settings";
const copy = getBuiltinClassicEditorText;

/** Built-in toolbar, ruler, sidebar, and status-bar contributions. */
export const builtinClassicEditorChromeContributions:
readonly ClassicEditorContribution[] = Object.freeze([
  {
    kind: "sidebar-panel",
    id: builtinClassicEditorPanelIds.globalSettings,
    side: "right",
    label: copy("globalSettings"),
    order: 5,
    when: (context) =>
      context.ui.state.rightSidebar.activePanelId
      === builtinClassicEditorPanelIds.globalSettings,
    render: renderBuiltinGlobalSettings
  },
  {
    kind: "sidebar-panel",
    id: builtinClassicEditorPanelIds.outline,
    side: "left",
    label: copy("outline"),
    order: 10,
    render: renderBuiltinOutline
  },
  {
    kind: "sidebar-panel",
    id: builtinClassicEditorPanelIds.documentProperties,
    side: "right",
    label: copy("documentProperties"),
    order: 10,
    when: (context) =>
      context.ui.state.rightSidebar.activePanelId
      === builtinClassicEditorPanelIds.documentProperties,
    render: renderBuiltinProperties
  },
  {
    kind: "status-item",
    id: "status.words",
    order: 10,
    render: renderBuiltinWordCount
  },
  {
    kind: "status-item",
    id: "status.selection",
    order: 20,
    render: renderBuiltinSelection
  },
  {
    kind: "status-item",
    id: "status.engine",
    audience: "developer",
    order: 100,
    render: renderBuiltinEngineStatus
  }
]);
