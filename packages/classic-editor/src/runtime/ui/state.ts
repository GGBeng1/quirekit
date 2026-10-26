import type { ClassicEditorSidebarState, ClassicEditorUiState } from "../../types";
import { createInitialClassicEditorSemanticSnapshot, freezeClassicEditorSemanticSnapshot, haveSameClassicEditorSemanticFreshness } from "./semantic-snapshot";

/**
 * Creates the first immutable UI snapshot.
 *
 * @param leftVisible - Initial left visibility.
 * @param rightVisible - Initial right visibility.
 * @param leftPanelId - Initial left panel id.
 * @param rightPanelId - Initial right panel id.
 * @param rulerVisible - Initial ruler visibility.
 * @param hiddenTextVisible - Initial hidden-text inspection preference.
 * @returns Frozen state snapshot.
 */
export function createState(
  leftVisible: boolean,
  rightVisible: boolean,
  leftPanelId: string,
  rightPanelId: string,
  rulerVisible: boolean,
  hiddenTextVisible: boolean
): ClassicEditorUiState {
  return Object.freeze({
    zoom: 100,
    zoomMode: "manual",
    invisibleCharactersVisible: false,
    hiddenTextVisible,
    rulerVisible,
    leftSidebar: Object.freeze({
      visible: leftVisible,
      activePanelId: leftPanelId,
      targetId: null,
      navigationRevision: 0
    }),
    rightSidebar: Object.freeze({
      visible: rightVisible,
      activePanelId: rightPanelId,
      targetId: null,
      navigationRevision: 0
    }),
    semantic: createInitialClassicEditorSemanticSnapshot()
  });
}

/**
 * Preserves one panel choice while changing visibility.
 *
 * @param state - Current sidebar state.
 * @param visible - Requested visibility.
 * @returns Frozen sidebar state.
 */
export function withVisible(
  state: ClassicEditorSidebarState,
  visible: boolean
): ClassicEditorSidebarState {
  return Object.freeze({ ...state, visible });
}

/**
 * Compares product values before notifying mounted consumers.
 * @param previous - Current immutable UI state.
 * @param state - Candidate UI state.
 * @param semanticChanged - Whether the semantic producer supplied a newer revision.
 * @returns Whether this candidate has no observable changes.
 */
export function sameUiState(previous: ClassicEditorUiState, state: ClassicEditorUiState, semanticChanged: boolean): boolean {
  return previous.zoom === state.zoom && previous.zoomMode === state.zoomMode
    && previous.invisibleCharactersVisible === state.invisibleCharactersVisible
    && previous.hiddenTextVisible === state.hiddenTextVisible
    && previous.rulerVisible === state.rulerVisible
    && previous.leftSidebar.visible === state.leftSidebar.visible
    && previous.leftSidebar.activePanelId === state.leftSidebar.activePanelId
    && previous.leftSidebar.targetId === state.leftSidebar.targetId
    && previous.leftSidebar.navigationRevision === state.leftSidebar.navigationRevision
    && previous.rightSidebar.visible === state.rightSidebar.visible
    && previous.rightSidebar.activePanelId === state.rightSidebar.activePanelId
    && previous.rightSidebar.targetId === state.rightSidebar.targetId
    && previous.rightSidebar.navigationRevision === state.rightSidebar.navigationRevision
    && !semanticChanged && haveSameClassicEditorSemanticFreshness(previous.semantic, state.semantic);
}

/**
 * Freezes the product snapshot independently of its caller's mutable data.
 * @param state - Candidate state after effective-change checks.
 * @returns State safe to share with product surfaces.
 */
export function freezeUiState(state: ClassicEditorUiState): ClassicEditorUiState {
  return Object.freeze({
    ...state,
    leftSidebar: Object.freeze({ ...state.leftSidebar }),
    rightSidebar: Object.freeze({ ...state.rightSidebar }),
    semantic: freezeClassicEditorSemanticSnapshot(state.semantic)
  });
}
