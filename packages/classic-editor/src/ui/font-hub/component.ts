import type { DefineComponent } from "vue";
import type { ClassicEditorFontHubProps } from "@classic/types";
import FontHub from "./font-hub.vue";

/** Public component facade with a stable TypeScript declaration boundary. */
const ClassicEditorFontHub = FontHub as unknown as DefineComponent<ClassicEditorFontHubProps>;

export default ClassicEditorFontHub;
