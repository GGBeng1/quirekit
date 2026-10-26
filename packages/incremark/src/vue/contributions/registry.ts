import type { VNodeChild } from "vue";
import { createMarkdownReading } from "@quirekit/incremark-core";
/** Unique Vue output family; syntax and codecs remain shared. */
export const vueReading = createMarkdownReading<VNodeChild>();
