import { resolveViewCoordinateAuthority } from "@quirekit/view-engine";
import type {
  QuireInputProxyPlacement,
  QuireInputProxyPlacementOptions
} from "./types";

const defaultInputProxyMinWidth = 150;
const defaultImePreeditInputProxyMinWidth = defaultInputProxyMinWidth;
const defaultImePreeditInputProxyMaxWidth = 480;
const imePreeditInputProxyCharacterWidth = 16;
const imePreeditInputProxyPadding = 32;

/**
 * Maps a logical caret rectangle into the positioned View root's CSS space.
 *
 * @param options - Surface bounds, surface client rectangle, and caret anchor.
 * @returns Input proxy placement local to the View root in CSS pixels.
 */
export function resolveQuireInputProxyPlacement(
  options: QuireInputProxyPlacementOptions
): QuireInputProxyPlacement {
  const scaleX = resolveSurfaceScale(options.surfaceClientRect.width, options.surfaceBounds.width);
  const scaleY = resolveSurfaceScale(options.surfaceClientRect.height, options.surfaceBounds.height);
  const minWidth = options.minWidth ?? defaultInputProxyMinWidth;
  const minHeight = options.minHeight ?? 20;
  const anchorRect = resolveViewCoordinateAuthority(
    options.surfaceClientRect,
    options.surfaceBounds
  ).clientRectFromDocument(options.anchor);
  // Client deltas include any host zoom; the proxy's styles are scaled by it again.
  const rootScale = resolvePositiveScale(options.positioningRootScale);

  return {
    left: (anchorRect.left - options.positioningRootClientRect.left) / rootScale,
    top: (anchorRect.top - options.positioningRootClientRect.top) / rootScale,
    width: Math.max(options.anchor.width * scaleX / rootScale, minWidth),
    height: Math.max(options.anchor.height * scaleY / rootScale, minHeight)
  };
}

/**
 * Normalizes a host-provided client-to-local scale.
 *
 * @param scale - Measured scale, if any.
 * @returns The scale when finite and positive, otherwise 1.
 */
function resolvePositiveScale(scale: number | undefined): number {
  return scale !== undefined && Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/**
 * Resolves a measurable textarea width while native IME composition is active.
 *
 * @param preeditText - Current preedit text rendered by QuireKit.
 * @returns Minimum CSS width for the hidden textarea input proxy.
 */
export function resolveQuireImePreeditInputProxyMinWidth(preeditText: string): number {
  if (preeditText.length === 0) {
    return defaultImePreeditInputProxyMinWidth;
  }

  return Math.min(
    Math.max(
      [...preeditText].length * imePreeditInputProxyCharacterWidth +
        imePreeditInputProxyPadding,
      defaultImePreeditInputProxyMinWidth
    ),
    defaultImePreeditInputProxyMaxWidth
  );
}

/**
 * Resolves a logical-to-client scale with a stable fallback for collapsed bounds.
 *
 * @param clientSize - Browser client size in CSS pixels.
 * @param logicalSize - Logical surface size.
 * @returns Scale used to map logical coordinates to CSS pixels.
 */
function resolveSurfaceScale(clientSize: number, logicalSize: number): number {
  if (!Number.isFinite(clientSize) || !Number.isFinite(logicalSize) || logicalSize <= 0) {
    return 1;
  }

  return clientSize / logicalSize;
}
