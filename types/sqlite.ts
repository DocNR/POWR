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
    message: string;
  }
  
  export interface SQLiteStatement {
    executeSync<T>(params?: any[]): T[] | null;
    finalizeSync(): void;
  }
  
  // Result set type for expo-sqlite
  export interface SQLResultSet {
    insertId?: number;
    rowsAffected: number;
    rows: {
      length: number;
      item: (index: number) => any;
      _array: any[];
    };
  }