export interface ListItem {
  id: string;
  label: string;
  detail?: string;
}

export interface ListProps {
  items: ListItem[];
  selected?: number;
  /** Fires when the underlying `<select>` activates an item (Enter while focused). */
  onSelect?: (index: number, item: ListItem | null) => void;
  /** Mouse: a primary click on a row activates that item (the pointer path to
   * the same action as keyboard Enter). */
  onActivate?: (index: number, item: ListItem | null) => void;
}
