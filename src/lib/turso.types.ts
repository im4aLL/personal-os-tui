// Transport types for the Turso HTTP v2 pipeline client.
export interface TursoArg {
  type: "text" | "integer" | "real" | "null";
  value?: string;
}

export interface TursoCol {
  name: string;
}

export type TursoColValue = null | TursoArg;

export interface TursoResult {
  cols: TursoCol[];
  rows: TursoColValue[][];
}

export interface TursoStatement {
  sql: string;
  args?: unknown[];
}
