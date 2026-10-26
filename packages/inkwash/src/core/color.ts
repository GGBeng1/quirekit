/**
 * 把任意 CSS 颜色（含 oklch 等）解析为 0–1 的 RGB 分量：借助 1×1 画布让浏览器完成换算。
 * @param color CSS 颜色字符串。
 * @returns RGB 分量。
 */
export function resolveCssColor(color: string): [number, number, number] {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
    return [red! / 255, green! / 255, blue! / 255];
}
