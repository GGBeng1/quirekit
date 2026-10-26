/** Fixed inert vocabulary; host configuration cannot expand it to executable elements. */
export const htmlTags = new Set(["span", "p", "div", "br", "hr", "strong", "b", "em", "i", "s", "del", "u", "small",
  "sub", "sup", "kbd", "samp", "mark", "code", "pre", "abbr", "a", "img", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption"]);
/** Void elements with dedicated, non-editable source-range widgets. */
export const voidTags = new Set(["br", "hr", "img"]);
/** Structures requiring one contiguous DOM subtree cannot cross native CM line boundaries. */
export const contiguousTags = new Set(["table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption"]);
/** Absolute parser/mount budget; oversized regions keep all original source. */
export const maxHtmlLength = 65_536;
