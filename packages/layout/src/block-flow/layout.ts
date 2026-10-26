import { layoutBlockFlowContainerInternal } from "./container";
import { layoutBlockFlowInputInternal } from "./input";
import type {
  LayoutQuireBlockFlowContainerOptions,
  LayoutQuireBlockFlowInputOptions,
  QuireBlockFlowBox,
  QuireBlockFlowContainer,
  QuireBlockFlowInput
} from "./types";

/**
 * Lays out one consumer-neutral recursive block container.
 *
 * @param options - Container geometry, children, cache, and typed services.
 * @returns Canonical container geometry with consumer-decorated child boxes.
 */
export function layoutQuireBlockFlowContainer<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(options: LayoutQuireBlockFlowContainerOptions<Input, Box>): QuireBlockFlowContainer<Box> {
  return layoutBlockFlowContainerInternal(
    options,
    (childOptions) => layoutQuireBlockFlowInput(childOptions)
  );
}

/**
 * Lays out one consumer-neutral block input with exact cache reuse.
 *
 * @param options - Input, resolved geometry, cache, and typed services.
 * @returns Consumer-decorated block result.
 */
export function layoutQuireBlockFlowInput<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(options: LayoutQuireBlockFlowInputOptions<Input, Box>): Box {
  return layoutBlockFlowInputInternal(
    options,
    (containerOptions) => layoutQuireBlockFlowContainer(containerOptions),
    true
  );
}

/**
 * Lays out one input while bypassing only the current input's cache lookup.
 *
 * @param options - Input, resolved geometry, cache, and typed services.
 * @returns Consumer-decorated block result.
 */
export function layoutQuireBlockFlowInputUncached<
  Input extends QuireBlockFlowInput,
  Box extends QuireBlockFlowBox
>(options: LayoutQuireBlockFlowInputOptions<Input, Box>): Box {
  return layoutBlockFlowInputInternal(
    options,
    (containerOptions) => layoutQuireBlockFlowContainer(containerOptions),
    false
  );
}
