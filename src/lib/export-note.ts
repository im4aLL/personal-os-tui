// Note export to `.txt` and `.md`, ported from the desktop's
// `personal-os/src/lib/export-note.ts` (the file-based parts only; PDF is
// deferred). The TUI has no save dialog, so exports land in
// `POS_EXPORT_DIR` when set, else `<config dir>/exports`, and collisions are
// de-duplicated with a numeric suffix. Runtime only; no exported types.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { configDir } from "./config";

/** Filesystem-safe form of a note title; falls back to `Untitled`. */
export function sanitizeFilename(title: string): string {
  const trimmed = title.trim().replace(/[/\\?%*:|"<>]/g, "-");
  return trimmed || "Untitled";
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
    .replace(/(\*{3}|_{3})(.+?)\1/g, "$2") // bold+italic
    .replace(/(\*{2}|_{2})(.+?)\1/g, "$2") // bold
    .replace(/~~(.+?)~~/g, "$1") // strikethrough
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/(\*|_)(.+?)\1/g, "$2"); // italic
}

/** Strip markdown syntax to plain text, leaving list markers intact since
 * bullets and numbering read fine as plain text. */
export function markdownToPlainText(markdown: string): string {
  const lines = markdown.split("\n");
  const output: string[] = [];
  let inCodeFence = false;

  for (const rawLine of lines) {
    if (/^\s*```/.test(rawLine)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) {
      output.push(rawLine);
      continue;
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(rawLine)) {
      continue; // horizontal rule
    }

    let line = rawLine.replace(/^(\s*>\s?)+/, ""); // blockquote markers
    line = line.replace(/^(\s*)#{1,6}\s+/, "$1"); // heading markers

    const listMatch = line.match(/^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/);
    const prefix = listMatch ? listMatch[1] : "";
    const rest = listMatch ? listMatch[2] : line;

    output.push(prefix + stripInlineMarkdown(rest));
  }

  return output.join("\n");
}

function exportDir(): string {
  const override = process.env.POS_EXPORT_DIR;
  if (override !== undefined && override !== "") {
    return resolve(override);
  }
  return join(configDir(), "exports");
}

/** First available path, appending `-1`, `-2`, ... before the extension. */
function uniquePath(dir: string, base: string, ext: string): string {
  let candidate = join(dir, `${base}${ext}`);
  let suffix = 1;
  while (existsSync(candidate)) {
    candidate = join(dir, `${base}-${suffix}${ext}`);
    suffix += 1;
  }
  return candidate;
}

async function writeExport(title: string, contents: string, ext: string): Promise<string> {
  const dir = exportDir();
  await mkdir(dir, { recursive: true });
  const path = uniquePath(dir, sanitizeFilename(title), ext);
  await writeFile(path, contents, "utf8");
  return path;
}

/** Write the note as plain text; returns the absolute written path. */
export function exportNoteAsTxt(title: string, content: string): Promise<string> {
  return writeExport(title, markdownToPlainText(content), ".txt");
}

/** Write the note verbatim as markdown; returns the absolute written path. */
export function exportNoteAsMarkdown(title: string, content: string): Promise<string> {
  return writeExport(title, content, ".md");
}
