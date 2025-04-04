// lib/db/db-service.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { createLogger } from '@/lib/utils/logger';

// Create database-specific logger
const logger = createLogger('SQLite');

export class DbService {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  async execAsync(sql: string): Promise<void> {
    try {
      logger.debug('Executing SQL:', sql);
      await this.db.execAsync(sql);
    } catch (error) {
      logger.error('SQL Error:', error);
      throw error;
    }
  }

  async runAsync(sql: string, params: any[] = []) {
    try {
      logger.debug('Running SQL:', sql);
      logger.debug('Parameters:', params);
      return await this.db.runAsync(sql, params);
    } catch (error) {
      logger.error('SQL Error:', error);
      throw error;
    }
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      return await this.db.getFirstAsync<T>(sql, params);
    } catch (error) {
      logger.error('SQL Error:', error);
      throw error;
    }
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      return await this.db.getAllAsync<T>(sql, params);
    } catch (error) {
      logger.error('SQL Error:', error);
      throw error;
    }
  }

  async withTransactionAsync(action: () => Promise<void>): Promise<void> {
    try {
      await this.db.withTransactionAsync(async () => {
        await action();
      });
    } catch (error) {
      logger.error('Transaction Error:', error);
      throw error;
    }
  }
}
