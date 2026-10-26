import type { ShapeTextblockFragmentsRequest } from "../shape";
import { resolveQuireTextblockIndentationGeometry, type QuireTextblockIndentationGeometry } from "../indentation";

/**
 * Shares indentation authority between fragment layout and cache identity.
 * @param request - Paragraph shaping context.
 * @returns Effective physical indentation geometry.
 */
export function resolveShapeIndentationGeometry(request: ShapeTextblockFragmentsRequest): QuireTextblockIndentationGeometry {
  return request.indentationGeometry ?? resolveQuireTextblockIndentationGeometry(
    request.node,
    request.options.width,
    request.baseDirection,
    request.wordNumberingMarker === undefined
      ? { characterPitch: request.characterPitch, paragraphModel: request.options.paragraphModel }
      : {
          indentation: request.wordNumberingMarker.indentation,
          characterPitch: request.characterPitch,
          reserveFirstLineForMarker: true,
          paragraphModel: request.options.paragraphModel
        }
  );
}
