import { SQLiteDatabase } from 'expo-sqlite';

export interface SQLTransaction {
  executeSql: (
    sqlStatement: string,
    args?: any[],
    callback?: (transaction: SQLTransaction, resultSet: SQLResultSet) => void,
    errorCallback?: (transaction: SQLTransaction, error: SQLError) => boolean
  ) => void;
}

export interface SQLResultSet {
  insertId?: number;
  rowsAffected: number;
  rows: {
    length: number;
    item: (index: number) => any;
    _array: any[];
  };
}

export interface SQLError {
  code: number;
  message: string;
}

// Extend the SQLiteDatabase type to include transaction methods
declare module 'expo-sqlite' {
  interface SQLiteDatabase {
    transaction(
      callback: (transaction: SQLTransaction) => void,
      errorCallback?: (error: SQLError) => void,
      successCallback?: () => void
    ): void;
  }
}