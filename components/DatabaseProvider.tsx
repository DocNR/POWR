// components/DatabaseProvider.tsx
import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SQLiteProvider, openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { schema } from '@/lib/db/schema';
import { ExerciseService } from '@/lib/db/services/ExerciseService';
import { EventCache } from '@/lib/db/services/EventCache';
import { DevSeederService } from '@/lib/db/services/DevSeederService';
import { logDatabaseInfo } from '@/lib/db/debug';

// Create context for services
interface DatabaseServicesContextValue {
  exerciseService: ExerciseService | null;
  eventCache: EventCache | null;
  devSeeder: DevSeederService | null;
}

const DatabaseServicesContext = React.createContext<DatabaseServicesContextValue>({
  exerciseService: null,
  eventCache: null,
  devSeeder: null,
});

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [services, setServices] = React.useState<DatabaseServicesContextValue>({
    exerciseService: null,
    eventCache: null,
    devSeeder: null,
  });

  React.useEffect(() => {
    async function initDatabase() {
      try {
        console.log('[DB] Opening database...');
        const db = openDatabaseSync('powr.db');
        
        console.log('[DB] Creating schema...');
        await schema.createTables(db);

        // Initialize services
        console.log('[DB] Initializing services...');
        const eventCache = new EventCache(db);
        const exerciseService = new ExerciseService(db);
        const devSeeder = new DevSeederService(db, exerciseService, eventCache);

        // Set services
        setServices({
          exerciseService,
          eventCache,
          devSeeder,
        });

        // Seed development database
        if (__DEV__) {
          console.log('[DB] Seeding development database...');
          await devSeeder.seedDatabase();
          await logDatabaseInfo();
        }
        
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
      <DatabaseServicesContext.Provider value={services}>
        {children}
      </DatabaseServicesContext.Provider>
    </SQLiteProvider>
  );
}

// Hooks for accessing services
export function useExerciseService() {
  const context = React.useContext(DatabaseServicesContext);
  if (!context.exerciseService) {
    throw new Error('Exercise service not initialized');
  }
  return context.exerciseService;
}

export function useEventCache() {
  const context = React.useContext(DatabaseServicesContext);
  if (!context.eventCache) {
    throw new Error('Event cache not initialized');
  }
  return context.eventCache;
}

export function useDevSeeder() {
  const context = React.useContext(DatabaseServicesContext);
  if (!context.devSeeder) {
    throw new Error('Dev seeder not initialized');
  }
  return context.devSeeder;
}