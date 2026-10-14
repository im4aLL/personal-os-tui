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
  /** Mouse: focus the clicked field. */
  onFocusField?: (field: LinkFormField) => void;
  /** Mouse: click on the submit button (same path as Enter). */
  onSubmit?: () => void;
  /** Mouse: apply a suggestion or remove an applied tag. */
  onAcceptSuggestion?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
}
