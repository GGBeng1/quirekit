// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuireKitFileUploadChangeDetails, QuireKitFileUploadCustomSlotProps, QuireKitFileUploadListProps } from "../../components/file-upload";
import FileUpload from "./file-upload.vue";
import FileList from "./file-list.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts the public upload with optional host-owned files and observable events.
 * @param controlled - Whether the host owns the file collection.
 * @param defaultFiles - Initial files for an uncontrolled upload.
 * @param custom - Whether to compose an external trigger and compact list.
 * @param list - Public list presentation options, independent from validation.
 * @returns The host, native input, reactive files and change reports.
 */
async function mountUpload(controlled: boolean, defaultFiles: File[] = [], custom = false, list: QuireKitFileUploadListProps = { layout: 'compact' }) {
  const state = reactive({ files: [] as File[], acceptUpdates: true, disabled: false, readOnly: false });
  const changes: QuireKitFileUploadChangeDetails[] = [];
  let uploadScope: QuireKitFileUploadCustomSlotProps | undefined;
  const host = document.createElement("form");
  document.body.append(host);
  const app = createApp(defineComponent({
    setup: () => () => h(FileUpload, {
      label: "文档附件", name: "attachments", required: true,
      accept: "text/plain", multiple: true, maxFiles: 2, defaultFiles,
      disabled: state.disabled, readOnly: state.readOnly,
      ...(controlled ? { modelValue: state.files } : {}),
      "onUpdate:modelValue": (files: File[] | undefined) => {
        if (controlled && state.acceptUpdates) state.files = files ?? [];
      },
      onFileChange: (details: QuireKitFileUploadChangeDetails) => { changes.push(details); }
    }, custom ? { default: (scope: QuireKitFileUploadCustomSlotProps) => {
      uploadScope = scope;
      return h('div', [
        h('button', { type: 'button', disabled: scope.disabled, onClick: scope.openFilePicker }, '选择上下文'),
        h(FileList, list)
      ]);
    } } : undefined)
  }));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return { host, input: host.querySelector<HTMLInputElement>('input[type="file"]')!, state, changes,
    getUploadScope: () => uploadScope! };
}

/**
 * Delivers File objects through the native file input's regular input handler.
 * @param input - Actual hidden file input from the public component.
 * @param files - Newly selected files.
 */
async function selectFiles(input: HTMLInputElement, files: File[]): Promise<void> {
  const transfer = new DataTransfer();
  files.forEach(file => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}

describe.each([false, true])("FileUpload controlled=%s recovery", controlled => {
  it("accepts a corrected file while clearing earlier rejection feedback", async () => {
    const { host, input, changes } = await mountUpload(controlled);
    const invalid = new File(["wrong"], "图片.png", { type: "image/png" });
    const valid = new File(["document"], "文档.txt", { type: "text/plain" });
    await selectFiles(input, [invalid]);
    expect(host.querySelectorAll(".qk-file-upload__rejection")).toHaveLength(1);
    await selectFiles(input, [valid]);
    expect(host.querySelectorAll(".qk-file-upload__rejection")).toHaveLength(0);
    expect(host.querySelector(".qk-file-upload__item-name")?.textContent).toBe("文档.txt");
    expect(changes.at(-1)?.acceptedFiles.map(file => file.name)).toEqual(["文档.txt"]);
    expect(changes.at(-1)?.rejectedFiles).toEqual([]);
  });

  it("keeps previous accepted files when a rejected extra file is corrected", async () => {
    const { host, input, changes } = await mountUpload(controlled);
    const first = new File(["first"], "第一份.txt", { type: "text/plain" });
    const invalid = new File(["wrong"], "错误图片.png", { type: "image/png" });
    const second = new File(["second"], "第二份.txt", { type: "text/plain" });
    await selectFiles(input, [first]);
    await selectFiles(input, [invalid]);
    await selectFiles(input, [second]);
    expect(host.querySelectorAll(".qk-file-upload__item")).toHaveLength(2);
    expect(changes.at(-1)?.acceptedFiles.map(file => file.name)).toEqual(["第一份.txt", "第二份.txt"]);
    expect(changes.at(-1)?.rejectedFiles).toEqual([]);
  });
});

it('composes a compact file list without a second upload form or validation owner', async () => {
  const { host, input, state } = await mountUpload(true, [], true);
  expect(host.querySelector('.qk-file-upload__dropzone')).toBeNull();
  expect(host.querySelectorAll('input[type="file"]')).toHaveLength(1);
  expect(host.querySelector('[data-layout="compact"]')).not.toBeNull();
  await selectFiles(input, [new File(['wrong'], 'invalid.png', { type: 'image/png' })]);
  expect(host.textContent).toContain('不支持此文件类型');
  const file = new File(['context'], 'context.txt', { type: 'text/plain' });
  await selectFiles(input, [file]);
  expect(state.files).toEqual([file]);
  expect(host.querySelectorAll('.qk-file-upload__rejection')).toHaveLength(0);
  expect(new FormData(host).getAll('attachments').map(item => (item as File).name)).toEqual(['context.txt']);
  host.querySelector<HTMLButtonElement>('[aria-label="移除 context.txt"]')!.click();
  await nextTick();
  expect(state.files).toHaveLength(0); expect(input.files).toHaveLength(0);
});

it('adds pasted or dropped files through the same validation owner without replacing the draft collection', async () => {
  const { host, state, changes, getUploadScope } = await mountUpload(true, [], true);
  const first = new File(['first'], '第一份.txt', { type: 'text/plain' });
  const second = new File(['second'], '第二份.txt', { type: 'text/plain' });
  const transfer = new DataTransfer(); transfer.items.add(first);
  expect(getUploadScope().addTransferFiles(transfer)).toBe(true);
  await nextTick();
  expect(state.files.map(file => file.name)).toEqual(['第一份.txt']);
  expect(getUploadScope().addTransferFiles(transfer)).toBe(true);
  await nextTick();
  expect(state.files).toEqual([first]);
  expect(changes.at(-1)?.rejectedFiles[0]?.errors).toContain('FILE_EXISTS');
  const next = new DataTransfer(); next.items.add(second);
  expect(getUploadScope().addTransferFiles(next)).toBe(true);
  await nextTick();
  expect(state.files).toEqual([first, second]);
  expect(new FormData(host).getAll('attachments').map(item => (item as File).name)).toEqual(['第一份.txt', '第二份.txt']);
  const overflow = new DataTransfer(); overflow.items.add(new File(['third'], '第三份.txt', { type: 'text/plain' }));
  expect(getUploadScope().addTransferFiles(overflow)).toBe(true);
  await nextTick();
  expect(state.files).toEqual([first, second]);
  expect(changes.at(-1)?.rejectedFiles[0]?.errors).toContain('TOO_MANY_FILES');
  state.disabled = true; await nextTick();
  expect(getUploadScope().addTransferFiles(next)).toBe(false);
  state.disabled = false; state.readOnly = true; await nextTick();
  expect(getUploadScope().addTransferFiles(next)).toBe(false);
  expect(state.files).toEqual([first, second]);
});

it('can hide inline rejection presentation without bypassing validation or losing accepted files', async () => {
  const { host, input, state, changes } = await mountUpload(true, [], true, { layout: 'strip', showRejections: false });
  const file = new File(['valid'], 'plan.txt', { type: 'text/plain' });
  await selectFiles(input, [file]);
  await selectFiles(input, [new File(['invalid'], 'photo.png', { type: 'image/png' })]);
  expect(host.querySelector('.qk-file-upload__rejections')).toBeNull();
  expect(state.files).toEqual([file]);
  expect(changes.at(-1)?.rejectedFiles[0]?.errors).toContain('FILE_INVALID_TYPE');
  expect(host.querySelector('[data-layout="strip"]')).not.toBeNull();
  expect(host.querySelector('.qk-file-icon')?.getAttribute('data-kind')).toBe('text');
});

it("keeps default files when recovering from rejection and reports public removal", async () => {
  const initial = new File(["initial"], "默认附件.txt", { type: "text/plain" });
  const { host, input, changes } = await mountUpload(false, [initial]);
  expect(host.querySelector(".qk-file-upload__item-name")?.textContent).toBe("默认附件.txt");
  expect(Array.from(input.files ?? []).map(file => file.name)).toEqual(["默认附件.txt"]);
  expect(input.validity.valueMissing).toBe(false);
  expect(new FormData(host).getAll("attachments").map(file => (file as File).name)).toEqual(["默认附件.txt"]);
  await selectFiles(input, [new File(["wrong"], "错误.png", { type: "image/png" })]);
  await selectFiles(input, [new File(["next"], "新增附件.txt", { type: "text/plain" })]);
  expect(changes.at(-1)?.acceptedFiles.map(file => file.name)).toEqual(["默认附件.txt", "新增附件.txt"]);
  host.querySelector<HTMLButtonElement>('[aria-label="移除 默认附件.txt"]')!.click();
  await nextTick();
  expect(changes.at(-1)?.acceptedFiles.map(file => file.name)).toEqual(["新增附件.txt"]);
});

it("synchronizes external replacement and clearing with the native file input", async () => {
  const { host, input, state } = await mountUpload(true);
  state.files = [new File(["external"], "外部附件.txt", { type: "text/plain" })];
  await nextTick();
  expect(host.querySelector(".qk-file-upload__item-name")?.textContent).toBe("外部附件.txt");
  expect(Array.from(input.files ?? []).map(file => file.name)).toEqual(["外部附件.txt"]);
  state.files = [];
  await nextTick();
  expect(host.querySelectorAll(".qk-file-upload__item")).toHaveLength(0);
  expect(input.files).toHaveLength(0);
  expect(input.validity.valueMissing).toBe(true);
  await selectFiles(input, [new File(["next"], "新附件.txt", { type: "text/plain" })]);
  expect(state.files.map(file => file.name)).toEqual(["新附件.txt"]);
});

it("uses the host collection for later reports when the host declines a selection update", async () => {
  const { host, input, state, changes } = await mountUpload(true);
  state.acceptUpdates = false;
  await selectFiles(input, [new File(["requested"], "尚未接受.txt", { type: "text/plain" })]);
  expect(host.querySelectorAll(".qk-file-upload__item")).toHaveLength(0);
  expect(changes.at(-1)?.acceptedFiles.map(file => file.name)).toEqual(["尚未接受.txt"]);
  await selectFiles(input, [new File(["wrong"], "错误.png", { type: "image/png" })]);
  expect(changes.at(-1)?.acceptedFiles).toEqual([]);
  expect(changes.at(-1)?.rejectedFiles.map(rejection => rejection.file.name)).toEqual(["错误.png"]);
});

describe("FileUpload language", () => {
  it("follows the active language in the default layout and the nested list", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp(() => h(QuireLocaleProvider, { locale: "en" }, () => h(FileUpload, { label: "Attachments", accept: "text/plain", multiple: true, maxFiles: 2 })));
    app.mount(host);
    cleanups.push(() => { app.unmount(); host.remove(); });
    await nextTick();
    expect(host.textContent).toContain("Choose files");
    expect(host.textContent).toContain("Drop files here, or click to choose");
    expect(host.textContent).toContain("Up to 2 files");
    expect(host.textContent).toContain("0 of 2 selected");
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    await selectFiles(input, [new File(["x"], "a.png", { type: "image/png" })]);
    await vi.waitFor(() => expect(host.textContent).toContain("Unsupported file type"));
    expect(host.querySelector('[aria-label="Remove a.png"]')).not.toBeNull();
    expect(host.textContent).not.toMatch(/[\p{Script=Han}]/u);
  });
});
