import { assertChartSpec, type ChartSnapshotAdapter } from "@quirekit/chart";
import { compileChartOption } from "./compile";

/**
 * Creates a browser-local static snapshot adapter. No live ECharts instance escapes.
 * @param ownerDocument - Canvas/font owner; never inferred from an unrelated window.
 * @returns Replaceable PNG snapshot adapter.
 */
export function createEChartsSnapshotAdapter(ownerDocument: Document): ChartSnapshotAdapter {
  const version = "echarts-6.1.0/simple-1/1";
  return {
    version,
    async render(value, request) {
      const spec = assertChartSpec(value);
      request.signal.throwIfAborted();
      if (![request.width, request.height, request.density].every((number) => Number.isFinite(number) && number > 0)
        || request.width * request.height * request.density ** 2 > 16_000_000) {
        throw new RangeError("Chart snapshot dimensions exceed the raster budget.");
      }
      // Font readiness belongs to the host document. Cancellation is rechecked after
      // both lazy loading and font loading before allocating any renderer instance.
      const [echarts, charts, components, renderers] = await Promise.all([
        import("echarts/core"), import("echarts/charts"), import("echarts/components"), import("echarts/renderers")
      ]);
      await ownerDocument.fonts?.load(`13px ${request.fontFamily}`);
      request.signal.throwIfAborted();
      echarts.use([charts.BarChart, charts.LineChart, charts.PieChart, components.GridComponent,
        components.LegendComponent, components.TitleComponent, renderers.CanvasRenderer]);
      const canvas = ownerDocument.createElement("canvas");
      const instance = echarts.init(canvas, undefined, {
        renderer: "canvas", ssr: true, width: request.width, height: request.height, devicePixelRatio: request.density
      });
      try {
        instance.setOption(compileChartOption(spec, request.fontFamily));
        const dataUrl = instance.getDataURL({ type: "png", pixelRatio: request.density, backgroundColor: "rgba(0,0,0,0)" });
        request.signal.throwIfAborted();
        const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
        return {
          signature: JSON.stringify([version, spec, request.width, request.height, request.density,
            request.fontFamily, request.fontRevision]),
          revision: spec.revision, dataUrl, bytes: Uint8Array.from(binary, (char) => char.charCodeAt(0)),
          width: Math.round(request.width * request.density), height: Math.round(request.height * request.density)
        };
      } finally {
        instance.dispose();
      }
    }
  };
}
