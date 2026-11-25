// Video links: YouTube and Vimeo. Pure helpers, no Astro. A video URL is parsed into provider and
// id; the page shows a local placeholder first and loads the privacy-friendly player only after a
// click (youtube-nocookie.com, Vimeo with dnt=1).

export type VideoProvider = "youtube" | "vimeo";

export interface VideoRef {
  provider: VideoProvider;
  id: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"];

/** Reads a YouTube (watch, youtu.be, embed) or Vimeo (vimeo.com/<id>, player.vimeo.com/video/<id>) URL. Returns undefined for anything else. */
export function parseVideoUrl(input: string): VideoRef | undefined {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:") return undefined;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter((s) => s !== "");

  if (host === "youtu.be") {
    return segments.length === 1 && YOUTUBE_ID.test(segments[0]) ? { provider: "youtube", id: segments[0] } : undefined;
  }
  if (YOUTUBE_HOSTS.includes(host)) {
    if (segments.length === 1 && segments[0] === "watch") {
      const id = url.searchParams.get("v") ?? "";
      return YOUTUBE_ID.test(id) ? { provider: "youtube", id } : undefined;
    }
    if (segments.length === 2 && segments[0] === "embed" && YOUTUBE_ID.test(segments[1])) return { provider: "youtube", id: segments[1] };
    return undefined;
  }
  if (host === "vimeo.com" || host === "www.vimeo.com") {
    return segments.length === 1 && VIMEO_ID.test(segments[0]) ? { provider: "vimeo", id: segments[0] } : undefined;
  }
  if (host === "player.vimeo.com") {
    return segments.length === 2 && segments[0] === "video" && VIMEO_ID.test(segments[1]) ? { provider: "vimeo", id: segments[1] } : undefined;
  }
  return undefined;
}

/** Like parseVideoUrl, but throws a clear error (a build error) for an unusable URL. */
export function requireVideoUrl(input: string): VideoRef {
  const ref = parseVideoUrl(input);
  if (!ref) throw new Error(`Video URL not recognised: "${input}". Use a YouTube (youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...) or Vimeo (vimeo.com/<number>) address.`);
  return ref;
}

/** The video's own page: a plain link, never loaded by the site. */
export function videoPageUrl(ref: VideoRef): string {
  return ref.provider === "youtube" ? `https://www.youtube.com/watch?v=${ref.id}` : `https://vimeo.com/${ref.id}`;
}

/** The player address that is loaded after a click. */
export function videoEmbedUrl(ref: VideoRef): string {
  return ref.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${ref.id}?autoplay=1`
    : `https://player.vimeo.com/video/${ref.id}?dnt=1&autoplay=1`;
}
