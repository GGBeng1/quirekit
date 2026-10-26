import type { EditorView } from "@quirekit/pm";
import { attrsEqual } from "../utilities/equality";
import { Decoration, type WidgetDecoration } from "./decoration";
import { liveWidgetKeys } from "./manager";
import type {
  CreateWidgetDecorationOptions,
  WidgetRenderer
} from "./types";

/** Per-editor renderer cache owned by one framework integration. */
interface WidgetRendererCache<TRenderer extends WidgetRenderer> {
  /** Mounted renderers keyed by stable widget identity. */
  readonly renderers: Map<string, TRenderer>;
  /** Last authored props applied to each renderer. */
  readonly props: Map<string, Record<string, any>>;
  /** Deferred prop updates collected during state application. */
  readonly pendingProps: Map<string, Record<string, any>>;
  /** Whether one microtask flush has already been queued. */
  flushScheduled: boolean;
}

/**
 * Creates a framework-rendered widget with stable per-editor renderer reuse.
 *
 * @param options - Widget position, identity, props, and framework hooks.
 * @returns Declarative widget decoration for `addDecorations()`.
 */
export function createWidgetDecoration<TRenderer extends WidgetRenderer>(
  options: CreateWidgetDecorationOptions<TRenderer>
): WidgetDecoration {
  const cache = getWidgetRendererCache<TRenderer>(
    options.editor,
    options.cacheKey
  );

  queueRendererProps(cache, options.key, options.props);

  const render = (
    _view: EditorView,
    getPos: () => number | undefined
  ): HTMLElement => {
    const rendererProps = { ...options.props, ...options.context(getPos) };
    let renderer = cache.renderers.get(options.key);

    if (renderer) {
      renderer.updateProps(rendererProps);
    } else {
      renderer = options.create(rendererProps);
      cache.renderers.set(options.key, renderer);
    }

    cache.props.set(options.key, { ...options.props });

    return options.materialize(renderer);
  };

  return Decoration.Widget(options.pos, render, {
    key: options.key,
    side: options.side,
    relaxedSide: options.relaxedSide,
    marks: options.marks,
    stopEvent: options.stopEvent,
    ignoreSelection: options.ignoreSelection,
    destroy(node) {
      if (liveWidgetKeys(options.editor).has(options.key)) {
        return;
      }

      try {
        cache.renderers.get(options.key)?.destroy();
        cache.renderers.delete(options.key);
        cache.props.delete(options.key);
        cache.pendingProps.delete(options.key);
      } finally {
        options.destroy?.(node);
      }
    }
  });
}

/**
 * Returns or creates one framework-specific renderer cache on an editor.
 *
 * @param editor - Editor that owns the renderer lifetime.
 * @param cacheKey - Framework-specific cache identity.
 * @returns Stable renderer cache.
 */
function getWidgetRendererCache<TRenderer extends WidgetRenderer>(
  editor: CreateWidgetDecorationOptions<TRenderer>["editor"],
  cacheKey: symbol
): WidgetRendererCache<TRenderer> {
  const host = editor as typeof editor & Record<
    symbol,
    WidgetRendererCache<TRenderer> | undefined
  >;
  let cache = host[cacheKey];

  if (!cache) {
    cache = {
      renderers: new Map(),
      props: new Map(),
      pendingProps: new Map(),
      flushScheduled: false
    };
    host[cacheKey] = cache;
    const ownedCache = cache;

    editor.on("destroy", () => {
      ownedCache.pendingProps.clear();
      for (const renderer of ownedCache.renderers.values()) {
        renderer.destroy();
      }
      ownedCache.renderers.clear();
      ownedCache.props.clear();
    });
  }

  return cache;
}

/**
 * Defers updates to an already-mounted renderer until state application ends.
 *
 * @param cache - Framework renderer cache.
 * @param key - Stable widget identity.
 * @param props - Next authored component props.
 */
function queueRendererProps<TRenderer extends WidgetRenderer>(
  cache: WidgetRendererCache<TRenderer>,
  key: string,
  props: Record<string, any>
): void {
  if (!cache.renderers.has(key)) {
    return;
  }

  const previous = cache.pendingProps.get(key) ?? cache.props.get(key);
  if (previous && attrsEqual(previous, props)) {
    return;
  }

  cache.pendingProps.set(key, props);
  if (cache.flushScheduled) {
    return;
  }

  cache.flushScheduled = true;
  queueMicrotask(() => flushRendererProps(cache));
}

/**
 * Applies deferred props to renderers that remain mounted.
 *
 * @param cache - Framework renderer cache to flush.
 */
function flushRendererProps<TRenderer extends WidgetRenderer>(
  cache: WidgetRendererCache<TRenderer>
): void {
  cache.flushScheduled = false;

  for (const [key, props] of cache.pendingProps) {
    const renderer = cache.renderers.get(key);
    if (!renderer) continue;
    renderer.updateProps(props);
    cache.props.set(key, { ...props });
  }

  cache.pendingProps.clear();
}
