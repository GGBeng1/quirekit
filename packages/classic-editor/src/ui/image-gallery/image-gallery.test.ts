// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { expect, it } from "vitest";
import { QuireLocaleProvider } from "@quirekit/ui/vue";
import ImageGallery from "./image-gallery.vue";
import type { ClassicEditorImageGalleryLabels } from "./types";

const labels: ClassicEditorImageGalleryLabels = {
  title: "Picture preview",
  close: "Close preview",
  previous: "Previous picture",
  next: "Next picture",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  fit: "Fit to view",
  rotateLeft: "Rotate left",
  rotateRight: "Rotate right",
  toolbar: "Picture tools",
  current: "Current picture",
  thumbnails: "Picture list",
  empty: "No pictures to preview",
  loading: "Loading picture…",
  unavailable: "Picture unavailable",
  retry: "Reload picture",
  thumbnail: (position, name) => `View picture ${position}: ${name}`,
  download: "Download picture"
};

it("keeps the consumer download action beside preview text from the active language", async () => {
  const root = document.createElement("div");
  root.className = "qk-classic-editor";
  document.body.append(root);
  const app = createApp({
    render: () => h(QuireLocaleProvider, { locale: "en" }, () => h(ImageGallery, {
      show: true,
      themeRoot: root,
      lang: "en",
      activeIndex: 1,
      positionLabel: "2 of 2",
      labels,
      items: [
        { id: "first", status: "ready", url: "/first.svg", altText: "First", label: "First picture" },
        { id: "second", status: "ready", url: "/second.svg", altText: "Second", label: "Second picture" }
      ]
    }))
  });
  app.mount(root);
  try {
    await nextTick();
    await expect.poll(() => document.querySelector(".qk-image-preview")).not.toBeNull();
    const preview = document.querySelector<HTMLElement>(".qk-image-preview")!;
    expect(preview.lang).toBe("en");
    expect(preview.querySelector('[aria-label="Current image"]')?.textContent).toBe("2 / 2");
    expect(preview.querySelector('[aria-label="Image tools"]')).not.toBeNull();
    expect(preview.querySelector(".qk-image-preview__previous")?.getAttribute("aria-label"))
      .toBe("Previous image");
    expect(preview.querySelector(".qk-image-preview__next")?.getAttribute("aria-label"))
      .toBe("Next image");
    expect(preview.querySelectorAll('[aria-label="Previous image"]')).toHaveLength(1);
    expect(preview.querySelectorAll('[aria-label="Next image"]')).toHaveLength(1);
    expect(preview.querySelector('[aria-label="Rotate right"]')).not.toBeNull();
    expect(preview.querySelector('[aria-label="Download picture"]')).not.toBeNull();
    expect(preview.querySelector('[aria-label="View image 2: Second picture"]')).not.toBeNull();
  } finally {
    app.unmount();
    root.remove();
  }
});
