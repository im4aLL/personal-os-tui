export interface LinkTagPill {
  /** Unique, stable key: `all` for the clear-all pill, `tag:<name>` for a user
   * tag, so a user tag literally named `all` never collides with the clear
   * pill. */
  id: string;
  label: string;
  /** Applied tag value; null for the clear-all pill. */
  tag: string | null;
}
