// types/sqlite.ts

// Database interfaces
export interface SQLite {
    rows: {
      _array: any[];
      length: number;
      item: (idx: number) => any;
    };
    rowsAffected: number;
    insertId?: number;
  }
  
  // Transaction interfaces
  export interface SQLiteCallback {
    (transaction: SQLTransaction, resultSet: SQLite): void;
  }
  
  export interface SQLErrorCallback {
    (transaction: SQLTransaction, error: Error): boolean;
  }
  
  export interface SQLTransaction {
    executeSql: (
      sqlStatement: string,
      args?: (string | number | null)[],
      callback?: SQLiteCallback,
      errorCallback?: SQLErrorCallback
    ) => void;
  }
  
  // Database error interfaces
  export interface SQLError extends Error {
    code?: number;
  }
  
  // Database open options
  export interface SQLiteOpenOptions {
    enableChangeListener?: boolean;
    useNewConnection?: boolean;
  }
  
  // Result interfaces
  export interface SQLiteRunResult {
    insertId: number;
    rowsAffected: number;
  }
  
  export interface SQLiteRow {
    [key: string]: any;
  }
  
  export interface SQLiteResultSet {
    insertId?: number;
    rowsAffected: number;
    rows: {
      length: number;
      _array: SQLiteRow[];
      item: (index: number) => SQLiteRow;
    };
  }
  
  // Transaction callbacks
  export interface TransactionCallback {
    (tx: SQLTransaction): void;
  }
  
  export interface TransactionErrorCallback {
    (error: SQLError): void;
  }
  
  export interface TransactionSuccessCallback {
    (): void;
  }
  
  // Database static type
  export interface Database {
    transaction(
      callback: TransactionCallback,
      error?: TransactionErrorCallback,
      success?: TransactionSuccessCallback
    ): void;
    readTransaction(
      callback: TransactionCallback,
      error?: TransactionErrorCallback,
      success?: TransactionSuccessCallback
    ): void;
    closeAsync(): Promise<void>;
  }