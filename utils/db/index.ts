// utils/db/index.ts
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db: SQLite.SQLiteDatabase;

export const getDatabase = () => {
  if (db) return db;
  
  if (Platform.OS === 'web') {
    // Return in-memory SQLite for web
    db = SQLite.openDatabaseSync('powr.db');
  } else {
    // Use async database for native platforms
    db = SQLite.openDatabaseSync('powr.db');
  }
  
  return db;
};

export const executeSql = async (
  sql: string, 
  params: any[] = []
): Promise<SQLite.SQLResultSet> => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction(tx => {
      tx.executeSql(
        sql, 
        params,
        (_, result) => resolve(result),
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};