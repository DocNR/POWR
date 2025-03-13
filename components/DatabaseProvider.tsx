import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SQLiteProvider, openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { schema } from '@/lib/db/schema';
import { ExerciseService } from '@/lib/db/services/ExerciseService';
import { DevSeederService } from '@/lib/db/services/DevSeederService';
import { PublicationQueueService } from '@/lib/db/services/PublicationQueueService';
import { FavoritesService } from '@/lib/db/services/FavoritesService';
import { WorkoutService } from '@/lib/db/services/WorkoutService';
import { TemplateService } from '@/lib/db/services/TemplateService';
import POWRPackService from '@/lib/db/services/POWRPackService';
import { logDatabaseInfo } from '@/lib/db/debug';
import { useNDKStore } from '@/lib/stores/ndk';

// Create context for services
interface DatabaseServicesContextValue {
  exerciseService: ExerciseService | null;
  workoutService: WorkoutService | null;
  templateService: TemplateService | null;
  devSeeder: DevSeederService | null;
  publicationQueue: PublicationQueueService | null;
  favoritesService: FavoritesService | null;
  powrPackService: POWRPackService | null;
  db: SQLiteDatabase | null;
}

const DatabaseServicesContext = React.createContext<DatabaseServicesContextValue>({
  exerciseService: null,
  workoutService: null,
  templateService: null,
  devSeeder: null,
  publicationQueue: null,
  favoritesService: null,
  powrPackService: null,
  db: null,
});

interface DatabaseProviderProps {
  children: React.ReactNode;
}

// Add a DelayedInitializer component to ensure database is fully ready
const DelayedInitializer: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [ready, setReady] = React.useState(false);
  
  React.useEffect(() => {
    // Small delay to ensure database is fully ready
    const timer = setTimeout(() => {
      console.log('[Database] Delayed initialization complete');
      setReady(true);
    }, 300); // 300ms delay should be sufficient
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" className="mb-2" />
        <Text className="text-foreground text-sm">Finishing initialization...</Text>
      </View>
    );
  }
  
  return <>{children}</>;
};

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [services, setServices] = React.useState<DatabaseServicesContextValue>({
    exerciseService: null,
    workoutService: null,
    templateService: null,
    devSeeder: null,
    publicationQueue: null,
    favoritesService: null,
    powrPackService: null,
    db: null,
  });
  
  // Get NDK from store to provide to services
  const ndk = useNDKStore(state => state.ndk);
  
  // Effect to set NDK on services when it becomes available
  React.useEffect(() => {
    if (ndk && services.devSeeder && services.publicationQueue) {
      services.devSeeder.setNDK(ndk);
      services.publicationQueue.setNDK(ndk);
    }
  }, [ndk, services]);

  React.useEffect(() => {
    async function initDatabase() {
      try {
        console.log('[DB] Starting database initialization...');
        
        // Add a small delay to ensure system is ready (especially on Android)
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('[DB] Opening database...');
        const db = openDatabaseSync('powr.db');
        
        console.log('[DB] Creating schema...');
        await schema.createTables(db);
        
        // Explicitly check for critical tables after schema creation
        await schema.ensureCriticalTablesExist(db);

        // Initialize services
        console.log('[DB] Initializing services...');
        const exerciseService = new ExerciseService(db);
        const workoutService = new WorkoutService(db);
        const templateService = new TemplateService(db);
        const devSeeder = new DevSeederService(db, exerciseService);
        const publicationQueue = new PublicationQueueService(db);
        const favoritesService = new FavoritesService(db);
        const powrPackService = new POWRPackService(db);
        
        // Initialize the favorites service
        await favoritesService.initialize();
        
        // Initialize NDK on services if available
        if (ndk) {
          devSeeder.setNDK(ndk);
          publicationQueue.setNDK(ndk);
        }

        // Set services
        setServices({
          exerciseService,
          workoutService,
          templateService,
          devSeeder,
          publicationQueue,
          favoritesService,
          powrPackService,
          db,
        });

        // Seed development database
        if (__DEV__) {
          console.log('[DB] Seeding development database...');
          try {
            await devSeeder.seedDatabase();
          } catch (seedError) {
            console.error('[DB] Error seeding database:', seedError);
            // Continue even if seeding fails
          }
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
        <DelayedInitializer>
          {children}
        </DelayedInitializer>
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

export function useWorkoutService() {
  const context = React.useContext(DatabaseServicesContext);
  if (!context.workoutService) {
    throw new Error('Workout service not initialized');
  }
  return context.workoutService;
}

export function useTemplateService() {
  const context = React.useContext(DatabaseServicesContext);
  if (!context.templateService) {
    throw new Error('Template service not initialized');
  }
  return context.templateService;
}

export function useDevSeeder() {
  const context = React.useContext(DatabaseServicesContext);
  if (!context.devSeeder) {
    throw new Error('Dev seeder not initialized');
  }
  return context.devSeeder;
}

export function usePublicationQueue() {
  const context = React.useContext(DatabaseServicesContext);
  if (!context.publicationQueue) {
    throw new Error('Publication queue not initialized');
  }
  return context.publicationQueue;
}

export function useFavoritesService() {
  const context = React.useContext(DatabaseServicesContext);
  if (!context.favoritesService) {
    throw new Error('Favorites service not initialized');
  }
  return context.favoritesService;
}

export function usePOWRPackService() {
  const context = React.useContext(DatabaseServicesContext);
  if (!context.powrPackService) {
    throw new Error('POWR Pack service not initialized');
  }
  return context.powrPackService;
}

export function useDatabase() {
  const context = React.useContext(DatabaseServicesContext);
  if (!context.db) {
    throw new Error('Database not initialized');
  }
  return context.db;
}