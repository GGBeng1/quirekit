import type {
  LayoutQuireBlockFlowInputOptions,
  QuireBlockFlowBox,
  QuireBlockFlowInput,
  QuireBlockFlowServices
} from "./types";

/**
 * Resolves the current input through consumer-owned specialized layout.
 *
 * @param options - Current block input and resolved geometry.
 * @returns Specialized result, or undefined for generic block flow.
 */
export function resolveSpecializedBlock<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(options: LayoutQuireBlockFlowInputOptions<Input, Box>): Box | undefined {
  if (!options.isSpecialized(options.input)) {
    return undefined;
  }

  const specialized = options.layoutSpecialized({
    input: options.input,
    x: options.x,
    y: options.y,
    width: options.width,
    blockHeight: options.blockHeight,
    blockGap: options.blockGap,
    fragmentBlockSize: options.fragmentBlockSize
  });

  if (specialized === undefined) {
    throw new Error(
      `Specialized block flow did not resolve input '${options.input.id}'.`
    );
  }

  return specialized;
}

/**
 * Reports whether an input subtree crosses a specialization boundary.
 *
 * @param input - Subtree root to inspect.
 * @param services - Typed child and specialization authority.
 * @returns Whether the subtree contains consumer-owned layout.
 */
export function containsSpecializedBlock<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(input: Input, services: QuireBlockFlowServices<Input, Box>): boolean {
  if (services.isSpecialized(input)) {
    return true;
  }

  return services.resolveChildren(input)?.some((child) =>
    containsSpecializedBlock(child, services)
  ) ?? false;
}
