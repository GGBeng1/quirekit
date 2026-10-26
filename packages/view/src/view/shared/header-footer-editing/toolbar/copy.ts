import type {
  QuireHeaderFooterChromeLocale,
  QuireHeaderFooterChromeMessages,
  QuireHeaderFooterToolbarRegion
} from "./types";

const messages: Readonly<Record<
  QuireHeaderFooterChromeLocale,
  Readonly<Record<QuireHeaderFooterToolbarRegion, QuireHeaderFooterChromeMessages>>
>> = {
  "zh-CN": {
    header: {
      regionLabel: "页眉",
      toolbarLabel: "页眉工具",
      distanceLabel: "距顶端",
      decreaseDistance: "减小页眉距顶端距离",
      increaseDistance: "增大页眉距顶端距离",
      close: "关闭",
      closeLabel: "关闭页眉",
      closeTooltip: "关闭页眉（Esc）",
      unit: "cm"
    },
    footer: {
      regionLabel: "页脚",
      toolbarLabel: "页脚工具",
      distanceLabel: "距底端",
      decreaseDistance: "减小页脚距底端距离",
      increaseDistance: "增大页脚距底端距离",
      close: "关闭",
      closeLabel: "关闭页脚",
      closeTooltip: "关闭页脚（Esc）",
      unit: "cm"
    }
  },
  en: {
    header: {
      regionLabel: "Header",
      toolbarLabel: "Header tools",
      distanceLabel: "From top",
      decreaseDistance: "Decrease header distance from top",
      increaseDistance: "Increase header distance from top",
      close: "Close",
      closeLabel: "Close header",
      closeTooltip: "Close header (Esc)",
      unit: "cm"
    },
    footer: {
      regionLabel: "Footer",
      toolbarLabel: "Footer tools",
      distanceLabel: "From bottom",
      decreaseDistance: "Decrease footer distance from bottom",
      increaseDistance: "Increase footer distance from bottom",
      close: "Close",
      closeLabel: "Close footer",
      closeTooltip: "Close footer (Esc)",
      unit: "cm"
    }
  }
};

/**
 * Resolves the mounted product language from the nearest `lang` owner.
 *
 * @param host - Overlay host inside the mounted product root.
 * @returns Supported chrome locale.
 */
export function resolveHeaderFooterChromeLocale(
  host: HTMLElement
): QuireHeaderFooterChromeLocale {
  const language = host.closest("[lang]")?.getAttribute("lang")
    ?? host.ownerDocument.documentElement.getAttribute("lang")
    ?? "en";
  return language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

/**
 * Reads localized copy for one region.
 *
 * @param locale - Mounted product language.
 * @param region - Active header or footer region.
 * @returns Complete chrome copy.
 */
export function resolveHeaderFooterChromeMessages(
  locale: QuireHeaderFooterChromeLocale,
  region: QuireHeaderFooterToolbarRegion
): QuireHeaderFooterChromeMessages {
  return messages[locale][region];
}
