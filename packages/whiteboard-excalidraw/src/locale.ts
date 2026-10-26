/** @param locale - Host UI language, matching the shared workspace's two built-in catalogues. @returns Excalidraw's exact bundled language code. */
export function whiteboardLanguage(locale = "zh-CN"): "en" | "zh-CN" { return /^en(?:-|$)/iu.test(locale.trim()) ? "en" : "zh-CN"; }
