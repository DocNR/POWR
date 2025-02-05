// utils/db/db-service.ts
import * as SQLite from 'expo-sqlite';
import { SQLiteDatabase } from 'expo-sqlite';
import { SQLiteResult, SQLiteRow, SQLiteError } from '@/types/sqlite';

export class DbService {
  private db: SQLiteDatabase | null = null;
  private readonly DEBUG = __DEV__;

  constructor(dbName: string) {
    try {
      this.db = SQLite.openDatabaseSync(dbName);
      if (this.DEBUG) {
        console.log('Database opened:', dbName);
      }
    } catch (error) {
      console.error('Error opening database:', error);
      throw error;
    }
  }

  async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      if (this.DEBUG) console.log('Starting transaction');
      await this.db.runAsync('BEGIN TRANSACTION');
      const result = await operation();
      await this.db.runAsync('COMMIT');
      if (this.DEBUG) console.log('Transaction committed');
      return result;
    } catch (error) {
      if (this.DEBUG) console.log('Rolling back transaction due to:', error);
      await this.db.runAsync('ROLLBACK');
      throw error;
    }
  }

  async executeSql<T extends SQLiteRow>(
    sql: string, 
    params: (string | number | null)[] = []
  ): Promise<SQLiteResult<T>> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      if (this.DEBUG) {
        console.log('Executing SQL:', sql);
        console.log('Parameters:', params);
      }

      // Use the appropriate method based on the SQL operation type
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        const results = await this.db.getAllAsync<T>(sql, params);
        return {
          rows: {
            _array: results,
            length: results.length,
            item: (idx: number) => {
              // For existing interface compatibility, return first item of array
              // when index is out of bounds instead of undefined
              return results[idx >= 0 && idx < results.length ? idx : 0];
            }
          },
          rowsAffected: 0 // SELECT doesn't modify rows
        };
      } else {
        const result = await this.db.runAsync(sql, params);
        return {
          rows: {
            _array: [],
            length: 0,
            item: (_: number) => ({} as T) // Return empty object for non-SELECT operations
          },
          rowsAffected: result.changes,
          insertId: result.lastInsertRowId
        };
      }

    } catch (error) {
      // Create proper SQLiteError with all required Error properties
      const sqlError: SQLiteError = Object.assign(new Error(), {
        name: 'SQLiteError',
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof Error ? (error as any).code : undefined
      });
      
      console.error('SQL Error:', {
        message: sqlError.message,
        code: sqlError.code,
        sql,
        params
      });
      
      throw sqlError;
    }
  }
  
  async executeWrite<T extends SQLiteRow>(
    sql: string, 
    params: (string | number | null)[] = []
  ): Promise<SQLiteResult<T>> {
    try {
      const result = await this.executeSql<T>(sql, params);
      
      // For INSERT/UPDATE/DELETE operations, verify the operation had an effect
      const isWriteOperation = /^(INSERT|UPDATE|DELETE)\b/i.test(sql.trim());
      
      if (isWriteOperation && !result.rowsAffected) {
        const error = `Write operation failed: ${sql.split(' ')[0]}`;
        if (this.DEBUG) {
          console.warn(error, { sql, params });
        }
        throw new Error(error);
      }
      
      return result;
    } catch (error) {
      if (this.DEBUG) {
        console.error('Write operation failed:', error);
      }
      throw error;
    }
  }

  async executeWriteMany<T extends SQLiteRow>(
    queries: Array<{ 
      sql: string; 
      args?: (string | number | null)[] 
    }>
  ): Promise<SQLiteResult<T>[]> {
    return this.withTransaction(async () => {
      const results: SQLiteResult<T>[] = [];
      
      for (const query of queries) {
        const result = await this.executeSql<T>(query.sql, query.args || []);
        results.push(result);
      }
      
      return results;
    });
  }

  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.db?.getFirstAsync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );
      return !!result;
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.db?.execAsync(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
      `);
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
      }
    } catch (error) {
      console.error('Error closing database:', error);
      throw error;
    }
  }
}