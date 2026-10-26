export { createApplyWordParagraphStyleCommand } from "./apply";
export { createWordParagraphStyleCommands } from "./factory";
export {
  createResetWordParagraphStyleRegistryCommand,
  createSetWordParagraphStyleRegistryCommand,
  createUpdateWordParagraphStyleCommand
} from "./registry";
export type {
  ApplyWordParagraphStyleOptions,
  SetWordParagraphStyleRegistryOptions,
  UpdateWordParagraphStyleOptions
} from "./types";

export type { CreateWordNamedStyleOptions, ApplyWordCharacterStyleOptions, UpdateWordCharacterStyleOptions } from "./named/types";
