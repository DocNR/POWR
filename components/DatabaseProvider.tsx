import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SQLiteProvider, openDatabaseSync } from 'expo-sqlite';
import { schema } from '@/lib/db/schema';

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function initDatabase() {
      try {
        console.log('[DB] Opening database...');
        const db = openDatabaseSync('powr.db');
        
        console.log('[DB] Creating schema...');
        await schema.createTables(db);
        
        console.log('[DB] Database initialized successfully');
        setIsReady(true);
      } catch (e) {
        console.error('[DB] Database initialization failed:', e);
        setError(e instanceof Error ? e.message : 'Database initialization failed');
      }
    }

    initDatabase();
  }, []);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-foreground text-lg font-bold mb-2">Database Error</Text>
        <Text className="text-destructive text-sm text-center">{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="mb-4" />
        <Text className="text-foreground text-base">Initializing Database...</Text>
      </View>
    );
  }

  return (
    <SQLiteProvider databaseName="powr.db">
      {children}
    </SQLiteProvider>
  );
}