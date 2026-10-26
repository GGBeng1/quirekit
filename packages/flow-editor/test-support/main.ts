import { createApp } from "vue";
import "virtual:uno.css";
import App from "./preview.vue";
import { installFlowchartPdfFonts } from "./fonts";
const release = installFlowchartPdfFonts(document), app = createApp(App); app.mount("#app");
if (import.meta.hot) import.meta.hot.dispose(() => { release(); app.unmount(); });
