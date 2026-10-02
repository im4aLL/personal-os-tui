// Hand-written validators for the Setup flow. A handful of simple forms
// do not need a schema library; these pure functions return an error message
// or null when the value is valid. No exported types: nothing here needs a
// `validate.types.ts` companion.
export function validateDbUrl(raw: string): string | null {
  const url = raw.trim();
  if (url === "") {
    return "Database URL is required";
  }
  if (!url.startsWith("https://") && !url.startsWith("libsql://")) {
    return "URL must start with https:// or libsql://";
  }
  return null;
}

export function validateProfileName(raw: string): string | null {
  if (raw.trim() === "") {
    return "Name is required";
  }
  return null;
}

export function validateProfileEmail(raw: string): string | null {
  const email = raw.trim();
  if (email === "") {
    return "Email is required";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email";
  }
  return null;
}
