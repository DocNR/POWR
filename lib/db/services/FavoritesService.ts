// lib/db/services/FavoritesService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '@/utils/ids';

type ContentType = 'template' | 'exercise' | 'workout';

export class FavoritesService {
  private db: SQLiteDatabase;
  
  constructor(db: SQLiteDatabase) {
    this.db = db;
  }
  
  async initialize(): Promise<void> {
    try {
      // Ensure the table exists with the right schema
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS favorites (
          id TEXT PRIMARY KEY,
          content_type TEXT NOT NULL,
          content_id TEXT NOT NULL,
          content TEXT NOT NULL,
          pubkey TEXT,
          created_at INTEGER NOT NULL,
          UNIQUE(content_type, content_id)
        );
        CREATE INDEX IF NOT EXISTS idx_favorites_content ON favorites(content_type, content_id);
      `);
    } catch (error) {
      console.error('[FavoritesService] Error initializing favorites table:', error);
      throw error;
    }
  }
  
  async addFavorite<T>(contentType: ContentType, contentId: string, content: T, pubkey?: string): Promise<string> {
    try {
      const id = generateId('local');
      const now = Date.now();
      
      await this.db.runAsync(
        `INSERT OR REPLACE INTO favorites (id, content_type, content_id, content, pubkey, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          contentType,
          contentId,
          JSON.stringify(content),
          pubkey || null,
          now
        ]
      );
      
      return id;
    } catch (error) {
      console.error('[FavoritesService] Error adding favorite:', error);
      throw error;
    }
  }
  
  async removeFavorite(contentType: ContentType, contentId: string): Promise<void> {
    try {
      await this.db.runAsync(
        `DELETE FROM favorites WHERE content_type = ? AND content_id = ?`,
        [contentType, contentId]
      );
    } catch (error) {
      console.error('[FavoritesService] Error removing favorite:', error);
      throw error;
    }
  }

  private async ensureTableExists(): Promise<boolean> {
    try {
      const tableExists = await this.db.getFirstAsync<{ count: number }>(
        `SELECT count(*) as count FROM sqlite_master 
         WHERE type='table' AND name='favorites'`
      );
      
      if (!tableExists || tableExists.count === 0) {
        await this.initialize();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[FavoritesService] Error checking if table exists:', error);
      await this.initialize();
      return false;
    }
  }
  
  async isFavorite(contentType: ContentType, contentId: string): Promise<boolean> {
    try {
      if (!(await this.ensureTableExists())) {
        return false;
      }
      
      const result = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM favorites WHERE content_type = ? AND content_id = ?`,
        [contentType, contentId]
      );
      
      return (result?.count || 0) > 0;
    } catch (error) {
      console.error('[FavoritesService] Error checking favorite status:', error);
      return false;
    }
  }
  
  // Modify the getFavoriteIds method in FavoritesService.ts:
  async getFavoriteIds(contentType: ContentType): Promise<string[]> {
    try {
      // First check if the table exists
      const tableExists = await this.db.getFirstAsync<{ count: number }>(
        `SELECT count(*) as count FROM sqlite_master 
        WHERE type='table' AND name='favorites'`
      );
      
      if (!tableExists || tableExists.count === 0) {
        console.log('[FavoritesService] Favorites table does not exist yet, returning empty array');
        // Initialize the table for next time
        await this.initialize();
        return [];
      }
      
      const result = await this.db.getAllAsync<{ content_id: string }>(
        `SELECT content_id FROM favorites WHERE content_type = ?`,
        [contentType]
      );
      
      return result.map(item => item.content_id);
    } catch (error) {
      console.error('[FavoritesService] Error fetching favorite IDs:', error);
      return [];
    }
  }
  
  async getFavorites<T>(contentType: ContentType): Promise<Array<{id: string, content: T, addedAt: number}>> {
    try {
      if (!(await this.ensureTableExists())) {
        return [];
      }
      
      const result = await this.db.getAllAsync<{
        id: string,
        content_id: string,
        content: string,
        created_at: number
      }>(
        `SELECT id, content_id, content, created_at FROM favorites WHERE content_type = ?`,
        [contentType]
      );
      
      return result.map(item => ({
        id: item.content_id,
        content: JSON.parse(item.content) as T,
        addedAt: item.created_at
      }));
    } catch (error) {
      console.error('[FavoritesService] Error fetching favorites:', error);
      return [];
    }
  }
  
  async getContentById<T>(contentType: ContentType, contentId: string): Promise<T | null> {
    try {
      const result = await this.db.getFirstAsync<{
        content: string
      }>(
        `SELECT content FROM favorites WHERE content_type = ? AND content_id = ?`,
        [contentType, contentId]
      );
      
      if (result?.content) {
        return JSON.parse(result.content) as T;
      }
      
      return null;
    } catch (error) {
      console.error('[FavoritesService] Error fetching content:', error);
      return null;
    }
  }
}