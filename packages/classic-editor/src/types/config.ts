import type { QuireKitTheme } from "@quirekit/ui";
import type { QuireAnyExtension, QuireEditor, QuireEditorContent } from "@quirekit/core";
import type {
  CanvasMountedViewRuntimeOptions,
  SvgMountedViewRuntimeOptions
} from "@quirekit/view";
import type {
  ClassicEditorFeatureOptions,
  ClassicEditorLocale,
  ClassicEditorResolvedFeatures,
  ClassicEditorViewBackend,
  ClassicEditorViewOptions
} from "./base";
import type { ClassicEditorPlugin } from "./plugin";
import type { ClassicEditorWebFontOptions } from "./fonts";
import type { ClassicEditorMediaServices } from "./media";
import type { ClassicEditorHostServices } from "./host";
import type { ClassicEditorShellOptions } from "./shell";
import type {
  ClassicEditorSurfaceMode,
  ClassicEditorUiProfileOptions
} from "./ui";

/** Existing session facts supplied while a preset refreshes its presentation. */
export interface ClassicEditorPresetPresentationContext {
  /** Retained Core whose schema, commands and history must remain unchanged. */
  readonly editor: QuireEditor;
  /** Current complete product theme. */
  readonly theme: QuireKitTheme;
  /** Current interface language. */
  readonly locale: ClassicEditorLocale;
  /** Host overrides that must retain precedence over theme defaults. */
  readonly canvasRuntime: Readonly<Partial<CanvasMountedViewRuntimeOptions>>;
  /** Host SVG overrides that must retain precedence over theme defaults. */
  readonly svgRuntime: Readonly<Partial<SvgMountedViewRuntimeOptions>>;
}

/** Input passed to a preset while it resolves Core and View extensions. */
export interface ClassicEditorPresetContext {
  /** Resolved product features. */
  readonly features: ClassicEditorResolvedFeatures;
  /** Resolved product theme available to presentation-owning extensions. */
  readonly theme: QuireKitTheme;
  /** Product-owned scrolling viewport used by Canvas page-stack mode. */
  readonly workspaceViewport: HTMLElement;
  /** Rendering backend selected for this mount. */
  readonly backend: ClassicEditorViewBackend;
  /** Consumer Canvas runtime overrides. */
  readonly canvasRuntime: Readonly<Partial<CanvasMountedViewRuntimeOptions>>;
  /** Consumer SVG runtime overrides. */
  readonly svgRuntime: Readonly<Partial<SvgMountedViewRuntimeOptions>>;
}

/** Reusable product preset resolved independently for every editor instance. */
export interface ClassicEditorPreset {
  /** Stable preset id used by diagnostics. */
  readonly id: string;
  /** Feature defaults merged before instance-level overrides. */
  readonly features: ClassicEditorFeatureOptions;
  /** Default product plugins installed before instance plugins. */
  readonly plugins?: readonly ClassicEditorPlugin[] | undefined;
  /** Complete shared theme used when the instance does not provide one. */
  readonly theme?: QuireKitTheme | undefined;
  /** Default shell configuration merged before instance overrides. */
  readonly shell?: ClassicEditorShellOptions | undefined;
  /** Final composition for action-backed product surfaces. */
  readonly ui?: ClassicEditorUiProfileOptions | undefined;
  /**
   * Refreshes preset-owned paint settings without replacing schema or session state.
   * Presets without this hook retain structural remounting for theme changes.
   * @param context - Current retained editor and presentation configuration.
   */
  readonly updatePresentation?: ((context: ClassicEditorPresetPresentationContext) => void) | undefined;
  /**
   * Resolves ordinary QuireKit extensions for one mounted instance.
   *
   * @param context - Features, viewport, and backend runtime inputs.
   * @returns Ordered QuireKit extensions installed into Core.
   */
  resolveExtensions(context: ClassicEditorPresetContext): readonly QuireAnyExtension[];
}

/** Options accepted when creating a Classic Editor product instance. */
export interface ClassicEditorOptions {
  /** Optional mount element. Omit or pass null to create an initially unmounted instance. */
  readonly element?: HTMLElement | null | undefined;
  /** Initial ProseMirror-compatible document content. */
  readonly document?: QuireEditorContent | undefined;
  /** Product preset. Defaults to `classicEditorPreset`. */
  readonly preset?: ClassicEditorPreset | undefined;
  /** Product-interface locale. Defaults to Simplified Chinese. */
  readonly locale?: ClassicEditorLocale | undefined;
  /** Create-time product surface mode. Defaults to the user-facing product. */
  readonly surfaceMode?: ClassicEditorSurfaceMode | undefined;
  /** Feature overrides merged with the selected preset. */
  readonly features?: ClassicEditorFeatureOptions | undefined;
  /** Product plugins installed after preset plugins. */
  readonly plugins?: readonly ClassicEditorPlugin[] | undefined;
  /** Ordinary QuireKit extensions appended after preset extensions. */
  readonly extensions?: readonly QuireAnyExtension[] | undefined;
  /** Whether the document accepts editing input. */
  readonly editable?: boolean | undefined;
  /** Product view backend selection. */
  readonly view?: ClassicEditorViewOptions | undefined;
  /** Canvas runtime overrides. Product page-stack values remain authoritative. */
  readonly canvasRuntime?: Readonly<Partial<CanvasMountedViewRuntimeOptions>> | undefined;
  /** SVG mounted-runtime overrides. */
  readonly svgRuntime?: Readonly<Partial<SvgMountedViewRuntimeOptions>> | undefined;
  /** Complete QuireKit theme taking precedence over the preset theme. */
  readonly theme?: QuireKitTheme | undefined;
  /** Product shell overrides merged with the preset shell. */
  readonly shell?: ClassicEditorShellOptions | undefined;
  /** Updated final composition for action-backed product surfaces. */
  readonly ui?: ClassicEditorUiProfileOptions | undefined;
  /** External font library policy, or `false` to disable acquisition. */
  readonly webFonts?: ClassicEditorWebFontOptions | false | undefined;
  /**
   * Instance-scoped media registration and resolution authorities.
   *
   * Omit this for the in-memory authoring repository. Hosts that persist
   * canonical JSON must provide matching durable media persistence.
   */
  readonly media?: ClassicEditorMediaServices | undefined;
  /** Create-time Host resource adapter boundary. It cannot be replaced by update(). */
  readonly host?: ClassicEditorHostServices | undefined;
}

/** Runtime options accepted by `ClassicEditorInstance.update()`. */
export interface ClassicEditorUpdateOptions {
  /** Optional replacement document. */
  readonly document?: QuireEditorContent | undefined;
  /** Optional replacement preset. */
  readonly preset?: ClassicEditorPreset | undefined;
  /** Updated product-interface locale. */
  readonly locale?: ClassicEditorLocale | undefined;
  /** Feature overrides to merge into current options. */
  readonly features?: ClassicEditorFeatureOptions | undefined;
  /** Replacement instance-level product plugins. */
  readonly plugins?: readonly ClassicEditorPlugin[] | undefined;
  /** Replacement instance-level QuireKit extensions. */
  readonly extensions?: readonly QuireAnyExtension[] | undefined;
  /** Updated editability. */
  readonly editable?: boolean | undefined;
  /** Updated product view backend selection. */
  readonly view?: ClassicEditorViewOptions | undefined;
  /** Canvas runtime overrides to merge into current options. */
  readonly canvasRuntime?: Readonly<Partial<CanvasMountedViewRuntimeOptions>> | undefined;
  /** SVG runtime overrides to merge into current options. */
  readonly svgRuntime?: Readonly<Partial<SvgMountedViewRuntimeOptions>> | undefined;
  /** Complete QuireKit theme replacing the current instance theme. */
  readonly theme?: QuireKitTheme | undefined;
  /** Shell options to merge into current options. */
  readonly shell?: ClassicEditorShellOptions | undefined;
  /** Updated final composition for action-backed product surfaces. */
  readonly ui?: ClassicEditorUiProfileOptions | undefined;
  /** Replacement external font library policy, or `false` to disable acquisition. */
  readonly webFonts?: ClassicEditorWebFontOptions | false | undefined;
}
