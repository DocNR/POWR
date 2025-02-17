// lib/db/db-service.ts
import { SQLiteDatabase } from 'expo-sqlite';

export class DbService {
  private db: SQLiteDatabase;
  private readonly DEBUG = __DEV__;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  async execAsync(sql: string): Promise<void> {
    try {
      if (this.DEBUG) {
        console.log('Executing SQL:', sql);
      }
      await this.db.execAsync(sql);
    } catch (error) {
      console.error('SQL Error:', error);
      throw error;
    }
  }

  async runAsync(sql: string, params: any[] = []) {
    try {
      if (this.DEBUG) {
        console.log('Running SQL:', sql);
        console.log('Parameters:', params);
      }
      return await this.db.runAsync(sql, params);
    } catch (error) {
      console.error('SQL Error:', error);
      throw error;
    }
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      return await this.db.getFirstAsync<T>(sql, params);
    } catch (error) {
      console.error('SQL Error:', error);
      throw error;
    }
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      return await this.db.getAllAsync<T>(sql, params);
    } catch (error) {
      console.error('SQL Error:', error);
      throw error;
    }
  }

  async withTransactionAsync(action: () => Promise<void>): Promise<void> {
    try {
      await this.db.withTransactionAsync(async () => {
        await action();
      });
    } catch (error) {
      console.error('Transaction Error:', error);
      throw error;
    }
  }
}