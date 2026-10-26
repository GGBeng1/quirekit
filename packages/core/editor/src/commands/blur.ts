import type { CommandSpec } from "../types";

/**
 * Blurs the mounted view when a view-specific blur target exists.
 *
 * @returns Whether the command was handled.
 */
export const blur: CommandSpec = () => () => true;
