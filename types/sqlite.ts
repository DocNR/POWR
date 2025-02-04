// types/sqlite.ts

export interface SQLiteRow {
  [key: string]: any;
}

export interface SQLiteResult<T = SQLiteRow> {
  rows: {
    _array: T[];
    length: number;
    item: (idx: number) => T;
  };
  rowsAffected: number;
  insertId?: number;
}

export interface SQLiteError extends Error {
  code?: number;
}

export interface SQLiteStatement {
  executeSync<T>(params?: any[]): T[] | null;
  finalizeSync(): void;
}