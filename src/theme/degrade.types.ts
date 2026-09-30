export interface ColorCaps {
  rgb: boolean;
  ansi256: boolean;
}

/** A named 16-color ANSI entry used for nearest-color degradation. */
export interface Ansi16Color {
  name: string;
  hex: string;
}
