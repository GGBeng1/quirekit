import { en, type Messages as QuireKitEmojiPickerMessages } from "../../locale/components/emoji-picker";
import { quireKitBuiltInLocales, quireKitDefaultLocale } from "../../locale/resolve";
import type { QuireKitEmojiGroup, QuireKitEmojiItem } from "./types";

// A curated, replaceable Unicode catalog. These are characters, not external assets;
// names and group labels come from the language packs.
const rows = [
  ["faces", "smile", [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🙂", "🙃", "😉", "😊", "🥰", "😍", "🤩", "😘", "😋", "😎", "🥳", "🤔", "🤗",
    "🤭", "🤫", "🤐", "😐", "🙄", "😴", "🥱", "😢", "😭", "😱", "😡", "🥺", "😷", "🤒", "🤯", "👋", "👌", "✌️", "👍", "👎", "👏",
    "🙌", "🙏", "🤝", "💪", "👀", "🧑‍💻"
  ]],
  ["nature", "pawPrint", [
    "🐶", "🐱", "🐼", "🐻", "🦊", "🐰", "🐸", "🐵", "🐔", "🐧", "🦋", "🐝", "🐢", "🐬", "🐳", "🦄", "🌱", "🌿", "🌳", "🌸", "🌻",
    "🌹", "☀️", "🌙", "⭐", "🌈", "🔥", "❄️"
  ]],
  ["food", "utensils", [
    "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍑", "🥑", "🥕", "🍞", "🥐", "🍔", "🍟", "🍕", "🍜", "🍚", "🥟", "🍣", "🎂", "🍰",
    "🍩", "🍪", "🍫", "☕", "🍵", "🧋", "🥂"
  ]],
  ["travel", "car", [
    "🚗", "🚕", "🚌", "🚲", "🚆", "🚄", "✈️", "🚀", "🚢", "🏠", "🏢", "🏫", "🏥", "🏕️", "🏖️", "🏔️", "🗺️", "🌏", "🧭", "🌅"
  ]],
  ["activities", "volleyball", [
    "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🎯", "⚽", "🏀", "🏐", "🎾", "🏓", "🎮", "🧩", "🎨", "🎵", "🎸", "🎹", "🎬", "🎤"
  ]],
  ["objects", "lightbulb", [
    "💡", "📌", "📅", "⏰", "⌛", "💻", "⌨️", "📱", "📷", "🔍", "📚", "📝", "✏️", "📎", "📁", "📊", "🔔", "📣", "🔒", "🔑",
    "🔧", "⚙️", "🔗", "🧪"
  ]],
  ["symbols", "heart", [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "💔", "✅", "❌", "⚠️", "🚫", "❗", "❓", "💯", "✨", "♻️", "➕", "➖", "➡️",
    "⬅️", "⬆️", "⬇️", "🔄"
  ]],
] as const;

/**
 * @param messages - EmojiPicker text of the active language; defaults to Chinese.
 * @returns Fresh, ordered category declarations.
 */
export function createQuireEmojiGroups(
  messages: QuireKitEmojiPickerMessages = quireKitDefaultLocale.messages.emojiPicker
): readonly QuireKitEmojiGroup[] {
  return rows.map(([value, icon]) => ({ value, label: messages.groups[value] ?? en.groups[value], icon }));
}

/**
 * Builds the default catalog; names of every built-in language stay searchable.
 * @param messages - EmojiPicker text of the active language; defaults to Chinese.
 * @returns The replaceable default Unicode catalog.
 */
export function createQuireEmojiCatalog(
  messages: QuireKitEmojiPickerMessages = quireKitDefaultLocale.messages.emojiPicker
): readonly QuireKitEmojiItem[] {
  const builtIn = quireKitBuiltInLocales.map(locale => locale.messages.emojiPicker.names);
  return rows.flatMap(([group, , values]) => values.map(value => {
    const label = messages.names[value] ?? en.names[value] ?? value;
    const keywords = [...new Set([label, ...builtIn.flatMap(names => names[value] ?? [])])];
    return { value, group, label, keywords };
  }));
}
