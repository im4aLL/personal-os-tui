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
}
