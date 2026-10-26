import { Editor } from "@quirekit/core";
import { defaultBaseTokens, themeCssVariableNames } from "@quirekit/ui";
import { htmlViewExtension } from "@quirekit/view-html";
import { createBlockEditorPreset } from "../preset";
import type { BlockEditorInstance, BlockEditorOptions } from "./types";
import { bindBlockHostLocale } from "../localization/host";
import { onBlockEditorLocaleChange, readBlockEditorLocale, setBlockEditorLocale } from "../localization/runtime";

const body = themeCssVariableNames.typography.body;
const type = defaultBaseTokens.typography;
// Match Prose's body role while keeping standalone mounts readable without a
// ThemeProvider. Explicit host fonts and document marks retain their ownership.
const bodyFont = `var(${body.fontWeight}, ${type.weight.regular}) var(${body.fontSize}, ${type.size[14]})/var(${body.lineHeight}, ${type.lineHeight[14]}) var(${body.fontFamily}, ${type.family.product})`;

/**
 * Creates a continuous-flow editor using existing Core semantics and HTML view.
 *
 * @param options - Content, semantic extensions, callbacks, and optional host.
 * @returns Product instance with one canonical editor and an explicit lifecycle.
 */
export function createBlockEditor(
  options: BlockEditorOptions = {}
): BlockEditorInstance {
  const { element, preset, extensions = [], view, locale = "zh-CN", ...editorOptions } = options;
  // CSS variables keep theme changes in presentation: the browser resolves the
  // same retained DOM/SVG without remounting or writing document formatting.
  const runtime = {
    ...view,
    displayListStyles: {
      font: bodyFont,
      textFillStyle: "var(--qk-color-text-primary, #111827)",
      caretFillStyle: "var(--qk-color-text-primary, #111827)",
      selectionFillStyle: "var(--qk-block-selection-fill, var(--qk-color-selection-document, rgba(96, 165, 250, 0.32)))",
      imePreeditBackgroundFillStyle: "var(--qk-color-selection-document, rgba(191, 219, 254, 0.55))",
      ...view?.displayListStyles
    }
  };
  const editor = new Editor({
    ...editorOptions,
    mode: "html",
    extensions: [
      ...(preset === false ? [] : createBlockEditorPreset(preset)),
      // Configure each supplied extension for this session so top-level storage
      // is not shared when hosts reuse the same extension definition.
      ...extensions.map((extension) => extension.configure({})),
      htmlViewExtension({ runtime })
    ]
  });

  setBlockEditorLocale(editor, locale);
  // Core alone owns content, commands and subscriptions. The product only
  // replaces its mounted surface; remounting must not recreate the document.
  let releaseHost: (() => void) | undefined;
  const instance: BlockEditorInstance = {
    editor,
    /** @returns Current session language. */
    get locale() { return readBlockEditorLocale(editor); },
    /** @param next - Requested interface language. */
    setLocale(next) { setBlockEditorLocale(editor, next); },
    /** @param listener - Presentation observer. @returns Subscription release. */
    onLocaleChange(listener) { return onBlockEditorLocaleChange(editor, listener); },
    /** @param host - New product host. @returns Primary continuous HTML view. */
    mount(host) {
      if (editor.isDestroyed) throw new Error("Cannot mount a destroyed Block Editor.");
      releaseHost?.(); editor.unmount();
      releaseHost = bindBlockHostLocale(editor, host);
      return editor.mount({
        element: host,
        mode: "html",
        ...(options.viewId === undefined ? {} : { id: options.viewId })
      });
    },
    /** Releases views without discarding the editor's document or undo history. */
    unmount() {
      releaseHost?.(); releaseHost = undefined;
      editor.unmount();
    },
    /** Releases the Core-owned session and every mounted resource. */
    destroy() {
      releaseHost?.(); releaseHost = undefined;
      editor.destroy();
    }
  };

  if (element) {
    try {
      instance.mount(element);
      if (options.autofocus !== undefined && options.autofocus !== false && options.autofocus !== null) {
        editor.commands.focus(options.autofocus);
      }
    } catch (error) {
      editor.destroy();
      throw error;
    }
  }
  return instance;
}
