import {
  unsetTextStyleAttributeCommand,
  unsetTextStyleAttributesCommand,
  type TextStyleAttributeExtensionOptions
} from "../attribute-extension";
import { Extension } from "@quirekit/core";
import {
  setAllRunLanguagesCommand,
  setRunLanguageCommand,
  setRunLanguageSlotsCommand
} from "./commands";
import { describeSetLanguageCommand, describeUnsetLanguageCommand } from "./descriptors";

/** Options for the Word-compatible run-language extension. */
export type LanguageOptions = TextStyleAttributeExtensionOptions;

/** Independent Word-compatible language-slot commands. */
export const Language = Extension.create<LanguageOptions>({
  name: "language",
  addOptions() {
    return { types: ["textStyle"] };
  },
  /**
   * Creates validated all-slot and slot-specific language commands.
   *
   * @returns Complete language command map.
   */
  addCommands() {
    return {
      setLanguage: describeSetLanguageCommand(setAllRunLanguagesCommand()),
      setLanguageSlots: setRunLanguageSlotsCommand(),
      unsetLanguage: describeUnsetLanguageCommand(unsetTextStyleAttributesCommand([
        "languageLatin",
        "languageEastAsia",
        "languageComplexScript"
      ])),
      setLatinLanguage: setRunLanguageCommand("languageLatin"),
      unsetLatinLanguage: unsetTextStyleAttributeCommand("languageLatin"),
      setEastAsiaLanguage: setRunLanguageCommand("languageEastAsia"),
      unsetEastAsiaLanguage: unsetTextStyleAttributeCommand("languageEastAsia"),
      setComplexScriptLanguage: setRunLanguageCommand("languageComplexScript"),
      unsetComplexScriptLanguage:
        unsetTextStyleAttributeCommand("languageComplexScript")
    };
  }
});
