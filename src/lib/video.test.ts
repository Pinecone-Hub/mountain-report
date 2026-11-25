import { describe, expect, it } from "vitest";
import { parseVideoUrl, requireVideoUrl, videoEmbedUrl, videoPageUrl } from "./video";

describe("parseVideoUrl", () => {
  it("reads YouTube watch, short and embed addresses", () => {
    const yt = { provider: "youtube", id: "45aV35tG6cM" };
    expect(parseVideoUrl("https://www.youtube.com/watch?v=45aV35tG6cM")).toEqual(yt);
    expect(parseVideoUrl("https://youtube.com/watch?v=45aV35tG6cM&t=10s")).toEqual(yt);
    expect(parseVideoUrl("https://m.youtube.com/watch?feature=x&v=45aV35tG6cM")).toEqual(yt);
    expect(parseVideoUrl("https://youtu.be/45aV35tG6cM?si=abc")).toEqual(yt);
    expect(parseVideoUrl("https://www.youtube.com/embed/45aV35tG6cM")).toEqual(yt);
    expect(parseVideoUrl("https://www.youtube-nocookie.com/embed/45aV35tG6cM")).toEqual(yt);
    expect(parseVideoUrl("  https://youtu.be/45aV35tG6cM  ")).toEqual(yt);
  });

  it("reads Vimeo addresses", () => {
    expect(parseVideoUrl("https://vimeo.com/76979871")).toEqual({ provider: "vimeo", id: "76979871" });
    expect(parseVideoUrl("https://player.vimeo.com/video/76979871?h=abc")).toEqual({ provider: "vimeo", id: "76979871" });
  });

  it("rejects other hosts, look-alikes and plain http", () => {
    expect(parseVideoUrl("https://example.com/watch?v=45aV35tG6cM")).toBeUndefined();
    expect(parseVideoUrl("https://youtube.com.evil.example/watch?v=45aV35tG6cM")).toBeUndefined();
    expect(parseVideoUrl("http://youtu.be/45aV35tG6cM")).toBeUndefined();
    expect(parseVideoUrl("https://dailymotion.com/video/x7")).toBeUndefined();
  });

  it("rejects malformed input, missing or bad ids and other YouTube pages", () => {
    expect(parseVideoUrl("")).toBeUndefined();
    expect(parseVideoUrl("not a url")).toBeUndefined();
    expect(parseVideoUrl("https://www.youtube.com/watch")).toBeUndefined();
    expect(parseVideoUrl("https://www.youtube.com/watch?v=short")).toBeUndefined();
    expect(parseVideoUrl("https://www.youtube.com/@channel")).toBeUndefined();
    expect(parseVideoUrl("https://www.youtube.com/playlist?list=PL123")).toBeUndefined();
    expect(parseVideoUrl("https://youtu.be/")).toBeUndefined();
    expect(parseVideoUrl("https://youtu.be/45aV35tG6cM/extra")).toBeUndefined();
    expect(parseVideoUrl("https://vimeo.com/channels/staffpicks")).toBeUndefined();
    expect(parseVideoUrl("https://vimeo.com/")).toBeUndefined();
  });
});

describe("requireVideoUrl", () => {
  it("returns the reference or throws naming the URL", () => {
    expect(requireVideoUrl("https://youtu.be/45aV35tG6cM").id).toBe("45aV35tG6cM");
    expect(() => requireVideoUrl("https://example.com/x")).toThrow(/Video URL not recognised: "https:\/\/example.com\/x"/);
  });
});

describe("videoPageUrl and videoEmbedUrl", () => {
  it("builds the original page and the click-to-load player", () => {
    const yt = { provider: "youtube" as const, id: "45aV35tG6cM" };
    const vi = { provider: "vimeo" as const, id: "76979871" };
    expect(videoPageUrl(yt)).toBe("https://www.youtube.com/watch?v=45aV35tG6cM");
    expect(videoPageUrl(vi)).toBe("https://vimeo.com/76979871");
    expect(videoEmbedUrl(yt)).toBe("https://www.youtube-nocookie.com/embed/45aV35tG6cM?autoplay=1");
    expect(videoEmbedUrl(vi)).toBe("https://player.vimeo.com/video/76979871?dnt=1&autoplay=1");
  });
});
