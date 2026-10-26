import { inject, provide, type InjectionKey } from "vue";
import type { EditorUIOverlayHost } from "./types";

const overlayKey: InjectionKey<EditorUIOverlayHost> = Symbol("editor-document-overlay");

/** @param host - Product-owned document coordinates and clipping boundary. */
export function provideEditorUIOverlayHost(host: EditorUIOverlayHost): void { provide(overlayKey, host); }

/** @returns The nearest document overlay, absent for standalone consumers. */
export function useEditorUIOverlayHost(): EditorUIOverlayHost | undefined { return inject(overlayKey, undefined); }
