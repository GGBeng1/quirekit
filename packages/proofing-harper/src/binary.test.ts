import { LocalLinter } from "harper.js";
import { binary } from "harper.js/binary";
import { slimBinary } from "harper.js/slimBinary";
import { expect, it } from "vitest";

const samples = [
  "😀 This is is a test. He go to school.",
  "I has a apple. Their going to the store.",
  "The colour of the centre is grey. The color of the center is gray.",
  "中文 QuireKit 与 English 拼写 mixed text.",
  "the editor runs fast. It works.",
  "They is happy. We was late.",
  "It is very unique. In order to proceed, we need to finish.",
  "Visit https://example.com or email me@example.com.",
  "The document has 31 pages. Press Ctrl+S to save.",
  "This is a correctly written sentence."
];

it("preserves full-binary plaintext rules and findings in every supported dialect", async () => {
  // Full also initializes slim glue. Finish that shared initialization before
  // constructing live slim handles, so the comparison cannot race two loaders.
  await binary.setup();
  await slimBinary.setup();
  const slim = new LocalLinter({ binary: slimBinary, dialect: 0 });
  try {
    for (const dialect of [0, 1, 2, 3, 4, 0]) {
      const full = new LocalLinter({ binary, dialect });
      try {
        await slim.setDialect(dialect);
        expect(await slim.getLintConfig()).toEqual(await full.getLintConfig());
        for (const text of samples) {
          const expected = await full.lint(text, { language: "plaintext" });
          try {
            const actual = await slim.lint(text, { language: "plaintext" });
            try {
              expect(actual.map(lint => lint.to_json()).sort()).toEqual(expected.map(lint => lint.to_json()).sort());
            } finally {
              for (const lint of actual) lint.free();
            }
          } finally {
            for (const lint of expected) lint.free();
          }
        }
      } finally {
        await full.dispose();
      }
    }
  } finally {
    await slim.dispose();
  }
}, 30_000);
