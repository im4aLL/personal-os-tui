// Shared link display helpers: the domain fallback for a blank title, the
// `host/path` label for a row, the date column label, and the URL scheme used
// to decide whether the system browser can open it. Runtime only; no exported
// types.

/** Bare hostname for a URL, or the raw value when it has none (e.g. `mailto:`). */
export function linkDomain(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "") {
      return url;
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** `host/path` label for the URL line. Falls back to the raw value for a URL
 * without a hostname so non-http schemes stay readable. */
export function linkDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "") {
      return url;
    }
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${host}${path}`;
  } catch {
    return url;
  }
}

/** Lowercase URL scheme without the colon (`https`, `mailto`, ...), or "" when
 * the URL cannot be parsed. */
export function linkScheme(url: string): string {
  try {
    return new URL(url).protocol.replace(/:$/, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Short created-at label: `Sep 12` same year, `Sep 12, 2025` otherwise. */
export function linkDateLabel(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(
    undefined,
    sameYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  );
}
