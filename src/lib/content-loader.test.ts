import { describe, expect, it } from "vitest";
import { isUntranslatedStub, languageOfFile, skipUntranslated } from "./content-loader";

describe("isUntranslatedStub", () => {
  it("is true for empty data and for data with only language independent fields", () => {
    expect(isUntranslatedStub({})).toBe(true);
    expect(isUntranslatedStub({ chapter: 1 })).toBe(true);
    expect(isUntranslatedStub({ id: "fig-1-1", chapter: "chapter-1", number: "1.1", series: ["global"] })).toBe(true);
  });

  it("is true for blank text, and for malformed data", () => {
    expect(isUntranslatedStub({ title: "  ", description: "" })).toBe(true);
    expect(isUntranslatedStub(null)).toBe(true);
    expect(isUntranslatedStub(undefined)).toBe(true);
    expect(isUntranslatedStub("text")).toBe(true);
    expect(isUntranslatedStub([])).toBe(true);
    expect(isUntranslatedStub({ title: 5 })).toBe(true);
  });

  it("is false when any translated text is present, even if other fields are missing", () => {
    expect(isUntranslatedStub({ title: "Titre" })).toBe(false);
    expect(isUntranslatedStub({ caption: "x" })).toBe(false);
    expect(isUntranslatedStub({ alt: "x", chapter: 1 })).toBe(false);
  });
});

describe("languageOfFile", () => {
  it("returns the parent folder name", () => {
    expect(languageOfFile("src/content/pages/fr/faq.md")).toBe("fr");
    expect(languageOfFile("a\\b\\en\\x.yml")).toBe("en");
    expect(languageOfFile("faq.md")).toBeUndefined();
    expect(languageOfFile(undefined)).toBeUndefined();
  });
});

describe("skipUntranslated", () => {
  function run(files: Array<Record<string, unknown>>, filePath = "src/content/pages/fr/x.md") {
    const set: unknown[] = [];
    const validated: unknown[] = [];
    const inner = {
      name: "fake",
      load: async (ctx: any) => {
        for (const data of files) {
          const parsed = await ctx.parseData({ id: "x", data, filePath });
          ctx.store.set({ id: "x", data: parsed, filePath });
        }
        // Other store methods still work through the proxy.
        ctx.store.keys();
      },
    };
    const context: any = {
      parseData: async (o: { data: unknown }) => {
        validated.push(o.data);
        return o.data;
      },
      store: { set: (e: unknown) => (set.push(e), true), keys: () => [] },
    };
    return skipUntranslated(inner as never, "en").load(context).then(() => ({ set, validated }));
  }

  it("stores and validates real entries, and drops stubs of other languages without validating them", async () => {
    const real = { title: "Glacier retreat", chapter: 1 };
    const { set, validated } = await run([{ chapter: 1 }, real, {}]);
    expect(validated).toEqual([real]);
    expect(set).toEqual([{ id: "x", data: real, filePath: "src/content/pages/fr/x.md" }]);
  });

  it("fails the build, naming the file, for a stub in the default language", async () => {
    await expect(run([{ chapter: 1 }], "src/content/pages/en/summary.md")).rejects.toThrow(/src\/content\/pages\/en\/summary\.md/);
    await expect(run([{}], "src/content/pages/en/summary.md")).rejects.toThrow(/default language/);
  });

  it("accepts a real entry in the default language", async () => {
    const real = { title: "Summary" };
    const { set } = await run([real], "src/content/pages/en/summary.md");
    expect(set).toHaveLength(1);
  });

  it("does nothing for no files", async () => {
    expect(await run([])).toEqual({ set: [], validated: [] });
  });
});
