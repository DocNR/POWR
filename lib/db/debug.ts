import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { SQLiteDatabase, openDatabaseSync } from 'expo-sqlite';

export async function getDatabasePath(dbName: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;
  try {
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    return dbInfo.exists ? dbPath : null;
  } catch (error) {
    console.error('Error checking database path:', error);
    return null;
  }
}

export async function checkDatabaseTables(db: SQLiteDatabase): Promise<string[]> {
  try {
    const result = await db.getFirstAsync<{ tables: string }>(
      "SELECT group_concat(name) as tables FROM sqlite_master WHERE type='table'"
    );
    return result?.tables?.split(',') || [];
  } catch (error) {
    console.error('Error checking database tables:', error);
    return [];
  }
}

export async function logDatabaseInfo(dbName: string = 'powr.db') {
  try {
    console.log('\n--- Database Debug Info ---');
    
    // Check database path
    const dbPath = await getDatabasePath(dbName);
    console.log('Database Path:', dbPath || 'Not found');
    
    if (dbPath) {
      // Check file info
      const fileInfo = await FileSystem.getInfoAsync(dbPath);
      console.log('File Info:', fileInfo);
      
      // Check tables
      const db = openDatabaseSync(dbName);
      const tables = await checkDatabaseTables(db);
      console.log('Tables:', tables);
    }
    
    console.log('------------------------\n');
  } catch (error) {
    console.error('Error logging database info:', error);
  }
}