import type { CreateQuireViewTargetHitTargetsOptions } from "../types";
import type { QuireHitTarget } from "../engine/types";
import {
  resolveQuireViewTargetLayer,
  resolveQuireViewTargetPointerPolicy
} from "../../view-graph";
import { createQuireViewTargetInteractionHit } from "./view-target-hit";

/**
 * Creates retained hit targets from qkView targets.
 *
 * @param options - qkView target descriptors plus their retained owner facts.
 * @returns Retained layout hit targets eligible for layer target routing.
 */
export function createQuireViewTargetHitTargets(
  options: CreateQuireViewTargetHitTargetsOptions
): readonly QuireHitTarget[] {
  return options.targets.flatMap((target) => {
    const range = target.range ?? options.fallbackRange;

    if (range === undefined) {
      return [];
    }

    const layer = resolveQuireViewTargetLayer(target);
    const pointerPolicy = resolveQuireViewTargetPointerPolicy(target, layer);
    if (
      pointerPolicy.kind !== "pass-through"
      && (
        options.viewRegion === undefined
        || options.source === undefined
        || options.capabilities === undefined
      )
    ) {
      return [];
    }
    const interactionHit = createQuireViewTargetInteractionHit({
      target,
      range,
      layer,
      pointerPolicy,
      viewRegion: options.viewRegion,
      source: options.source,
      capabilities: options.capabilities
    });

    return [
      {
        id: `${options.idPrefix}:${target.id}`,
        range,
        rect: target.rect,
        ...(target.hitArea === undefined ? {} : { hitArea: target.hitArea }),
        ...(options.interactionScope === undefined
          ? {}
          : { interactionScope: options.interactionScope }),
        ...(options.viewRegion === undefined ? {} : { viewRegion: options.viewRegion }),
        ...(options.source === undefined ? {} : { source: options.source }),
        ...(options.capabilities === undefined
          ? {}
          : { capabilities: options.capabilities }),
        layer,
        pointerPolicy,
        ...(interactionHit === undefined ? {} : { interactionHit })
      }
    ];
  });
}
