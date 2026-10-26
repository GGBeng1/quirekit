import { defaultTheme } from "@quirekit/ui";
import type { QuireAnyExtension, QuireEditorContent } from "@quirekit/core";
import type {
  CanvasMountedViewRuntimeOptions,
  SvgMountedViewRuntimeOptions
} from "@quirekit/view";
import { defaultClassicEditorLocale } from "../localization";
import { classicEditorPreset, createClassicEditorDefaultDocument } from "../preset";
import { resolveClassicEditorFeatures } from "../plugin/registry/features";
import { resolveClassicEditorSurfaceMode } from "../plugin/registry/audience";
import type {
  ClassicEditorLocale,
  ClassicEditorMediaServices,
  ClassicEditorHostServices,
  ClassicEditorOptions,
  ClassicEditorPlugin,
  ClassicEditorPreset,
  ClassicEditorResolvedFeatures,
  ClassicEditorShellOptions,
  ClassicEditorSurfaceMode,
  QuireKitTheme,
  ClassicEditorUiProfileOptions,
  ClassicEditorUpdateOptions,
  ClassicEditorViewBackend,
  ClassicEditorWebFontOptions
} from "../types";
import { createDefaultClassicEditorWebFontOptions } from "./web-fonts";
import { resolveClassicEditorMediaServices } from "./media";
import { createDefaultClassicEditorHostServices } from "./host-resource/services";

/** Fully resolved immutable configuration used by a runtime mount. */
export interface ResolvedClassicEditorOptions {
  /** Selected product preset. */
  readonly preset: ClassicEditorPreset;
  /** Canonical initial or preserved document. */
  readonly document: QuireEditorContent;
  /** Resolved product-interface locale. */
  readonly locale: ClassicEditorLocale;
  /** Create-time product surface registration mode. */
  readonly surfaceMode: ClassicEditorSurfaceMode;
  /** Resolved product feature switches. */
  readonly features: ClassicEditorResolvedFeatures;
  /** Preset and instance product plugins. */
  readonly plugins: readonly ClassicEditorPlugin[];
  /** Consumer-provided ordinary QuireKit extensions. */
  readonly extensions: readonly QuireAnyExtension[];
  /** Whether mounted input may edit. */
  readonly editable: boolean;
  /** Rendering backend selected for the current mount. */
  readonly backend: ClassicEditorViewBackend;
  /** Consumer Canvas runtime overrides. */
  readonly canvasRuntime: Readonly<Partial<CanvasMountedViewRuntimeOptions>>;
  /** Consumer SVG runtime overrides. */
  readonly svgRuntime: Readonly<Partial<SvgMountedViewRuntimeOptions>>;
  /** Resolved product theme. */
  readonly theme: QuireKitTheme;
  /** Resolved product shell options. */
  readonly shell: Required<ClassicEditorShellOptions>;
  /** Resolved action-backed surface composition. */
  readonly ui: ClassicEditorUiProfileOptions;
  /** Resolved external font library policy. */
  readonly webFonts: ClassicEditorWebFontOptions | false;
  /** Stable media authorities retained across mount cycles. */
  readonly media: ClassicEditorMediaServices;
  /** Stable create-time Host resource adapters. */
  readonly host: ClassicEditorHostServices;
}

/**
 * Resolves creation options into a complete product configuration.
 *
 * @param options - Consumer creation options.
 * @returns Complete configuration.
 */
export function resolveClassicEditorOptions(
  options: ClassicEditorOptions
): ResolvedClassicEditorOptions {
  const preset = options.preset ?? classicEditorPreset;
  const locale = options.locale ?? defaultClassicEditorLocale;
  const listMarkerCollision = options.view?.listMarkerCollision;
  return {
    preset,
    document: options.document ?? createClassicEditorDefaultDocument(locale),
    locale,
    surfaceMode: resolveClassicEditorSurfaceMode(options.surfaceMode),
    features: resolveClassicEditorFeatures(preset.features, options.features),
    plugins: Object.freeze([...(preset.plugins ?? []), ...(options.plugins ?? [])]),
    extensions: Object.freeze([...(options.extensions ?? [])]),
    editable: options.editable ?? true,
    backend: options.view?.backend ?? "canvas",
    canvasRuntime: Object.freeze({
      ...(options.canvasRuntime ?? {}),
      ...(listMarkerCollision === undefined ? {} : { listMarkerCollision })
    }),
    svgRuntime: Object.freeze({
      ...(options.svgRuntime ?? {}),
      ...(listMarkerCollision === undefined ? {} : { listMarkerCollision })
    }),
    theme: options.theme ?? preset.theme ?? defaultTheme,
    shell: resolveShell(preset.shell, options.shell),
    ui: resolveUiProfile(preset.ui, options.ui),
    webFonts: options.webFonts === false
      ? false
      : options.webFonts ?? createDefaultClassicEditorWebFontOptions(),
    media: resolveClassicEditorMediaServices(options.media),
    host: options.host ?? createDefaultClassicEditorHostServices()
  };
}

/**
 * Merges runtime updates into the current consumer option state.
 *
 * @param current - Current consumer options.
 * @param update - Partial runtime update.
 * @param document - Latest preserved document when no replacement is provided.
 * @returns Next consumer options.
 */
export function mergeClassicEditorUpdate(
  current: ClassicEditorOptions,
  update: ClassicEditorUpdateOptions,
  document: QuireEditorContent
): ClassicEditorOptions {
  return {
    ...current,
    document: update.document ?? document,
    ...(update.preset === undefined ? {} : { preset: update.preset }),
    ...(update.locale === undefined ? {} : { locale: update.locale }),
    ...(update.features === undefined
      ? {}
      : { features: { ...(current.features ?? {}), ...update.features } }),
    ...(update.plugins === undefined ? {} : { plugins: update.plugins }),
    ...(update.extensions === undefined ? {} : { extensions: update.extensions }),
    ...(update.editable === undefined ? {} : { editable: update.editable }),
    ...(update.view === undefined
      ? {}
      : { view: { ...(current.view ?? {}), ...update.view } }),
    ...(update.canvasRuntime === undefined
      ? {}
      : { canvasRuntime: { ...(current.canvasRuntime ?? {}), ...update.canvasRuntime } }),
    ...(update.svgRuntime === undefined
      ? {}
      : { svgRuntime: { ...(current.svgRuntime ?? {}), ...update.svgRuntime } }),
    ...(update.theme === undefined
      ? {}
      : { theme: update.theme }),
    ...(update.shell === undefined
      ? {}
      : { shell: { ...(current.shell ?? {}), ...update.shell } }),
    ...(update.ui === undefined
      ? {}
      : { ui: resolveUiProfile(current.ui, update.ui) }),
    ...(update.webFonts === undefined ? {} : { webFonts: update.webFonts })
  };
}

/**
 * Merges and freezes independent action-backed surface profiles.
 *
 * @param base - Preset or current profile.
 * @param override - Instance-level profile overrides.
 * @returns Resolved product UI profile.
 */
function resolveUiProfile(
  base: ClassicEditorUiProfileOptions | undefined,
  override: ClassicEditorUiProfileOptions | undefined
): ClassicEditorUiProfileOptions {
  return Object.freeze({
    toolbar: freezeSurfaceProfile(override?.toolbar ?? base?.toolbar),
    contextMenu: freezeSurfaceProfile(override?.contextMenu ?? base?.contextMenu),
    selectionPopup: freezeSurfaceProfile(override?.selectionPopup ?? base?.selectionPopup)
  });
}

/**
 * Freezes one surface profile and its ordered id list.
 *
 * @param profile - Optional profile or disabled marker.
 * @returns Frozen profile, false, or undefined.
 */
function freezeSurfaceProfile(
  profile: ClassicEditorUiProfileOptions["toolbar"]
): ClassicEditorUiProfileOptions["toolbar"] {
  if (profile === undefined || profile === false) return profile;
  return Object.freeze({
    ...(profile.items === undefined
      ? {}
      : { items: Object.freeze([...profile.items]) })
  });
}

/**
 * Resolves every optional shell field to a concrete value.
 *
 * @param base - Preset shell defaults.
 * @param override - Instance shell overrides.
 * @returns Required shell configuration.
 */
function resolveShell(
  base: ClassicEditorShellOptions | undefined,
  override: ClassicEditorShellOptions | undefined
): Required<ClassicEditorShellOptions> {
  const value = { ...(base ?? {}), ...(override ?? {}) };
  return Object.freeze({
    menuBar: value.menuBar ?? true,
    ribbon: value.ribbon ?? true,
    toolbar: value.toolbar ?? true,
    ribbonOverflow: value.ribbonOverflow ?? "scroll",
    ruler: value.ruler ?? true,
    leftSidebar: value.leftSidebar ?? false,
    rightSidebar: value.rightSidebar ?? false,
    statusBar: value.statusBar ?? true,
    activeRibbonTab: value.activeRibbonTab ?? "home",
    commandBar: value.commandBar ?? Object.freeze({})
  });
}
