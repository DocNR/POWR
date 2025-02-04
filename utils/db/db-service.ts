// utils/db/db-service.ts
import * as SQLite from 'expo-sqlite';
import { 
  SQLite as SQLiteResult, 
  SQLTransaction, 
  SQLiteCallback, 
  SQLErrorCallback,
  SQLError,
  TransactionCallback,
  TransactionErrorCallback,
  TransactionSuccessCallback
} from '@/types/sqlite';

export class DbService {
  private db: SQLite.SQLiteDatabase;

  constructor(dbName: string) {
    this.db = SQLite.openDatabaseSync(dbName);
  }

  async executeSql(sql: string, params: (string | number | null)[] = []): Promise<SQLiteResult> {
    return new Promise((resolve, reject) => {
      this.db.withTransactionAsync(async (tx) => {
        tx.executeSql(
          sql,
          params,
          (_, result) => resolve(result),
          (_, error) => {
            console.error('SQL Error:', error);
            reject(error);
            return false;
          }
        );
      }).catch(error => {
        console.error('Transaction Error:', error);
        reject(error);
      });
    });
  }

  async executeWrite(sql: string, params: (string | number | null)[] = []): Promise<SQLiteResult> {
    return this.executeSql(sql, params);
  }

  async executeWriteMany(queries: { sql: string; args?: (string | number | null)[] }[]): Promise<SQLiteResult[]> {
    return new Promise((resolve, reject) => {
      const results: SQLiteResult[] = [];
      
      this.db.withTransactionAsync(async (tx) => {
        try {
          for (const query of queries) {
            await new Promise<void>((resolveQuery, rejectQuery) => {
              tx.executeSql(
                query.sql,
                query.args || [],
                (_, result) => {
                  results.push(result);
                  resolveQuery();
                },
                (_, error) => {
                  console.error('SQL Error:', error);
                  rejectQuery(error);
                  return false;
                }
              );
            });
          }
          resolve(results);
        } catch (error) {
          console.error('Transaction Error:', error);
          reject(error);
        }
      }).catch(error => {
        console.error('Transaction Error:', error);
        reject(error);
      });
    });
  }

  async withTransaction<T>(
    callback: (tx: SQLTransaction) => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.db.withTransactionAsync(async (tx) => {
        try {
          const result = await callback(tx);
          resolve(result);
        } catch (error) {
          console.error('Transaction Error:', error);
          reject(error);
        }
      }).catch(error => {
        console.error('Transaction Error:', error);
        reject(error);
      });
    });
  }

  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.executeSql(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.db.closeAsync();
    } catch (error) {
      console.error('Error closing database:', error);
      throw error;
    }
  }
}