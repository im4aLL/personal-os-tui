export interface ListItem {
  id: string;
  label: string;
  detail?: string;
}

export interface ListProps {
  items: ListItem[];
  selected?: number;
}
