// The demo editor (Decap "test-repo" backend) reads the repository files from window.repoFiles,
// a nested object that mirrors the repository paths. Pure helpers, no file access.

export interface RepoFile {
  /** Repository path with forward slashes, such as "src/content/chapters/en/chapter-1.md". */
  path: string;
  content: string;
}

export interface RepoTree {
  [name: string]: RepoTree | { content: string };
}

/** Folders whose files the editor never uses. */
const SKIPPED = [/(^|\/)\.DS_Store$/];

/** Repository files the editor can open: Markdown, YAML and JSON. */
export function isEditableFile(path: string): boolean {
  return /\.(md|ya?ml|json)$/i.test(path) && !SKIPPED.some((re) => re.test(path));
}

/**
 * Builds {src: {content: {chapters: {en: {"chapter-1.md": {content}}}}}} from a flat list.
 * Throws on an empty path or when a path is used both as a file and as a folder.
 */
export function buildRepoTree(files: readonly RepoFile[]): RepoTree {
  const root: RepoTree = {};
  for (const file of files) {
    const parts = file.path.split("/").filter((p) => p !== "");
    if (parts.length === 0) throw new Error("repo file with an empty path");
    let node = root;
    for (const part of parts.slice(0, -1)) {
      const next = node[part];
      if (next === undefined) {
        const created: RepoTree = {};
        node[part] = created;
        node = created;
      } else if (typeof next.content === "string") {
        throw new Error(`"${file.path}": "${part}" is a file, not a folder`);
      } else node = next as RepoTree;
    }
    const name = parts[parts.length - 1];
    if (node[name] !== undefined) throw new Error(`duplicate or conflicting repo path "${file.path}"`);
    node[name] = { content: file.content };
  }
  return root;
}

/**
 * JavaScript that sets window.repoFiles. "<" is escaped so file text cannot end the script early.
 * Decap's test backend lists a folder collection with the whole folder path as ONE key of
 * window.repoFiles (but reads and writes single files by nested path), so each collection folder
 * is also set as a top-level key that points at the same nested object: a save through either
 * path shows up in both.
 */
export function repoFilesScript(tree: RepoTree, folders: readonly string[] = []): string {
  const json = JSON.stringify(tree).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
  const aliases = folders.map((folder) => {
    const parts = folder.split("/").filter((p) => p !== "");
    if (parts.length === 0) throw new Error("collection folder with an empty path");
    const access = parts.map((p) => `[${JSON.stringify(p)}]`).join("");
    return `window.repoFiles[${JSON.stringify(parts.join("/"))}] = window.repoFiles${access};\n`;
  });
  return `window.repoFiles = ${json};\n${aliases.join("")}`;
}
