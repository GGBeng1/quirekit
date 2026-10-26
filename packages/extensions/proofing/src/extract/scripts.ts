/** Script slot a character selects when it starts or continues a word. */
export type ProofingScriptClass = "latin" | "complex" | "east-asian" | "neutral";

/**
 * Han, kana, Hangul, Bopomofo, and East Asian punctuation and full-width forms:
 * written without spaces and never sent to Latin checkers without an East Asian language.
 */
const eastAsianPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u303F\uFE30-\uFE4F\uFF00-\uFFEF]/u;

/** Strong right-to-left scripts, which use Word's complex-script language slot. */
const complexPattern = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u;

/** Letters and combining marks of every other script. */
const letterPattern = /[\p{L}\p{M}]/u;

/**
 * Classifies one code point for language-slot selection.
 *
 * Neutral characters (spaces, punctuation, digits) never switch the language
 * of the surrounding text, so a sentence keeps one segment.
 *
 * @param character - One code point.
 * @returns Script slot class.
 */
export function classifyProofingCharacter(character: string): ProofingScriptClass {
  if (eastAsianPattern.test(character)) return "east-asian";
  if (complexPattern.test(character)) return "complex";
  return letterPattern.test(character) ? "latin" : "neutral";
}
