// utils/db/db-service.ts
import { 
  openDatabaseSync,
  SQLiteDatabase 
} from 'expo-sqlite';
import { 
  SQLiteResult,
  SQLiteError,
  SQLiteRow
} from '@/types/sqlite';

export class DbService {
  private db: SQLiteDatabase | null = null;

  constructor(dbName: string) {
    try {
      this.db = openDatabaseSync(dbName);
      console.log('Database opened:', this.db);
    } catch (error) {
      console.error('Error opening database:', error);
      throw error;
    }
  }

  async executeSql<T extends SQLiteRow = any>(
    sql: string, 
    params: (string | number | null)[] = []
  ): Promise<SQLiteResult<T>> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const statement = this.db.prepareSync(sql);
      const result = statement.executeSync<T>(params);
      statement.finalizeSync();

      return {
        rows: {
          _array: Array.isArray(result) ? result : [],
          length: Array.isArray(result) ? result.length : 0,
          item: (idx: number) => (Array.isArray(result) ? result[idx] : null) as T
        },
        rowsAffected: Array.isArray(result) ? result.length : 0,
        insertId: undefined // SQLite doesn't provide this directly
      };
    } catch (error) {
      console.error('SQL Error:', error, sql, params);
      throw error;
    }
  }

  async executeWrite<T extends SQLiteRow = any>(
    sql: string, 
    params: (string | number | null)[] = []
  ): Promise<SQLiteResult<T>> {
    return this.executeSql<T>(sql, params);
  }

  async executeWriteMany<T extends SQLiteRow = any>(
    queries: Array<{ 
      sql: string; 
      args?: (string | number | null)[] 
    }>
  ): Promise<SQLiteResult<T>[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const results: SQLiteResult<T>[] = [];
    
    for (const query of queries) {
      try {
        const result = await this.executeSql<T>(query.sql, query.args || []);
        results.push(result);
      } catch (error) {
        console.error('Error executing query:', query, error);
        throw error;
      }
    }
    
    return results;
  }

  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.executeSql<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );
      return result.rows._array.length > 0;
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.executeSql('PRAGMA foreign_keys = ON;');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }
}