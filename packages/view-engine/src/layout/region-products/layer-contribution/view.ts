import { compileQuireViewNode, createQuireWidgetConstraints, type QuireRect } from "@quirekit/renderer";
import { deferQuireLayerContributionBody, isQuireLayerContributionDeferralEnabled } from "./deferred";
import type {
  QuireLayerContributionBody,
  QuireRetainedLayerContributionDeclaration,
  QuireRetainedLayerContributionViewRequest
} from "./types";

/**
 * Compiles a region-owned neutral view tree into retained renderer artifacts.
 *
 * This phase is backend-independent: exact source authorities provide the view
 * tree, while the region-product layer binds geometry, layer, and occurrence
 * identity before Canvas, SVG, or HTML consume the declaration. A runtime-activated
 * request defers the compile until its artifacts are first read, which happens only
 * while its owner is selected.
 *
 * @param request - Exact owner namespace, geometry, layer, and neutral view tree.
 * @returns Complete declaration ready for canonical ownership validation.
 */
export function compileQuireRetainedLayerContributionView(
  request: QuireRetainedLayerContributionViewRequest
): QuireRetainedLayerContributionDeclaration {
  const header = {
    contributionId: request.contributionId,
    regionId: request.regionId,
    ...(request.visualInstanceId === undefined
      ? {}
      : { visualInstanceId: request.visualInstanceId }),
    ...(request.interactionScope === undefined
      ? {}
      : { interactionScope: request.interactionScope }),
    range: request.range
  };
  const tail = {
    ...(request.visualBounds === undefined
      ? {}
      : { visualBounds: request.visualBounds }),
    coordinateSpace: "document" as const,
    layer: request.layer,
    paintSurface: request.paintSurface,
    ...(request.activation === undefined ? {} : { activation: request.activation })
  };

  if (request.activation !== undefined && isQuireLayerContributionDeferralEnabled()) {
    return deferQuireLayerContributionBody<QuireRetainedLayerContributionDeclaration>(
      { ...header, rect: resolveConstrainedRect(request.rect), ...tail },
      () => compileBody(request).body
    );
  }
  const compiled = compileBody(request);
  return { ...header, rect: compiled.rect, ...tail, ...compiled.body };
}

/**
 * Compiles the view tree at the requested rectangle.
 *
 * @param request - Exact owner namespace, geometry, and neutral view tree or its factory.
 * @returns Root rectangle and renderer artifacts.
 */
function compileBody(
  request: QuireRetainedLayerContributionViewRequest
): { readonly rect: QuireRect; readonly body: QuireLayerContributionBody } {
  const visualInstanceSuffix = request.visualInstanceId === undefined
    ? ""
    : `:${request.visualInstanceId}`;
  const compiled = compileQuireViewNode({
    id: `${request.rootId}:${request.regionId}${visualInstanceSuffix}:${request.contributionId}`,
    node: typeof request.node === "function" ? request.node() : request.node,
    origin: { x: request.rect.x, y: request.rect.y },
    constraints: {
      minWidth: request.rect.width,
      maxWidth: request.rect.width,
      minHeight: request.rect.height,
      maxHeight: request.rect.height
    },
    range: request.range,
    layer: request.paintSurface
  });
  return {
    rect: compiled.rect,
    body: {
      commands: compiled.displayList.commands,
      domOverlays: compiled.domOverlays,
      targets: compiled.targets
    }
  };
}

/**
 * Resolves the root rectangle a compile would produce, without compiling.
 *
 * Equal minimum and maximum constraints fix every root node's size to the normalized
 * requested size at the requested origin.
 *
 * @param rect - Requested document rectangle.
 * @returns Root rectangle of the compiled view.
 */
function resolveConstrainedRect(rect: QuireRect): QuireRect {
  const constraints = createQuireWidgetConstraints({
    minWidth: rect.width,
    maxWidth: rect.width,
    minHeight: rect.height,
    maxHeight: rect.height
  });
  return { x: rect.x, y: rect.y, width: constraints.minWidth, height: constraints.minHeight };
}
