import { quireProseComponents } from "./native";
import { QuireProseImage } from "../image";
import { QuireProseSource } from "../source";

/** QuireKit reading defaults: interactive images and full code display, with every other native element retained. */
export const quireRichProseComponents = Object.freeze({ ...quireProseComponents, img: QuireProseImage, pre: QuireProseSource });
