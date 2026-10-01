export type LinkFormField = "url" | "title" | "tags";

export interface LinkFormValues {
  url: string;
  title: string;
  tags: string[];
}

export interface LinkFormProps {
  values: LinkFormValues;
  /** Field that owns the keyboard; the screen drives Tab order. */
  focusedField: LinkFormField;
  tagInput: string;
  suggestions: string[];
  suggestionIndex: number;
  /** Validation or duplicate error, rendered under the fields. */
  error: string | null;
  saving: boolean;
  onPatch: (patch: Partial<LinkFormValues>) => void;
  onTagInputChange: (value: string) => void;
}
