import type { LinkFormField, LinkFormValues } from "../components/links/LinkForm.types";

export interface LinkFormState {
  open: boolean;
  values: LinkFormValues;
  field: LinkFormField;
  tagInput: string;
  suggestionIndex: number;
  error: string | null;
  saving: boolean;
}

export interface LinkConfirmState {
  id: string;
  title: string;
}
