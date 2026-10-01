// The repository seam for stores and screens. `cli.tsx` seeds `current` once
// at bootstrap (right after `initSession`), so every domain store reaches data
// through `getRepos()` instead of importing a concrete implementation. Runtime
// only; the `Repos` shape lives in `src/repos/types.ts`.
import type { Repos } from "../repos/types";

let current: Repos | null = null;

export function setRepos(repos: Repos): void {
  current = repos;
}

export function getRepos(): Repos {
  if (current === null) {
    throw new Error("repos are not configured");
  }
  return current;
}
