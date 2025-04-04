// components/DatabaseProvider.tsx
import React from 'react';
import { View, ActivityIndicator, ScrollView, Text } from 'react-native';
import { SQLiteProvider, openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import { schema } from '@/lib/db/schema';
import { ExerciseService } from '@/lib/db/services/ExerciseService';
import { PublicationQueueService } from '@/lib/db/services/PublicationQueueService';
import { FavoritesService } from '@/lib/db/services/FavoritesService';
import { WorkoutService } from '@/lib/db/services/WorkoutService';
import { TemplateService } from '@/lib/db/services/TemplateService';
import POWRPackService from '@/lib/db/services/POWRPackService';
import { logDatabaseInfo } from '@/lib/db/debug';
import { useNDKStore } from '@/lib/stores/ndk';
import { useLibraryStore } from '@/lib/stores/libraryStore';
import { createLogger, setQuietMode } from '@/lib/utils/logger';

// Create database-specific logger
const logger = createLogger('DatabaseProvider');

// Create context for services
interface DatabaseServicesContextValue {
  exerciseService: ExerciseService | null;
  workoutService: WorkoutService | null;
  templateService: TemplateService | null;
  publicationQueue: PublicationQueueService | null;
  favoritesService: FavoritesService | null;
  powrPackService: POWRPackService | null;
  db: SQLiteDatabase | null;
}

const DatabaseServicesContext = React.createContext<DatabaseServicesContextValue>({
  exerciseService: null,
  workoutService: null,
  templateService: null,
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
      logger.info('Delayed initialization complete');
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
    publicationQueue: null,
    favoritesService: null,
    powrPackService: null,
    db: null,
  });
  
  // Enable quiet mode to reduce console noise
  React.useEffect(() => {
    // Set quiet mode (only show errors) to reduce console output
    setQuietMode(true);
    logger.info('Quiet mode enabled to reduce console output');
    
    return () => {
      // Restore normal logging when component unmounts
      setQuietMode(false);
    };
  }, []);
  
  // Get NDK from store to provide to services
  const ndk = useNDKStore(state => state.ndk);
  
  // Effect to set NDK on services when it becomes available
  React.useEffect(() => {
    if (ndk && services.publicationQueue) {
      services.publicationQueue.setNDK(ndk);
    }
  }, [ndk, services]);

  // Effect to trigger initial data refresh when database is ready
  React.useEffect(() => {
    if (isReady && services.db) {
      console.log('[DB] Database ready - triggering initial library refresh');
      // Refresh all library data
      useLibraryStore.getState().refreshAll();
    }
  }, [isReady, services.db]);

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
        
        // Run migrations with robust error handling
        const runMigration = async (version: string, migrationFn: (db: SQLiteDatabase) => Promise<void>) => {
          try {
            await migrationFn(db);
            console.log(`[DB] Migration ${version} executed successfully`);
          } catch (migrationError) {
            console.warn(`[DB] Error running migration ${version}:`, migrationError);
            // Log more details about the error
            if (migrationError instanceof Error) {
              console.warn(`[DB] Migration error details: ${migrationError.message}`);
              if (migrationError.stack) {
                console.warn(`[DB] Stack trace: ${migrationError.stack}`);
              }
            }
            // Continue even if migration fails - tables might already be updated
          }
        };
        
        // Run migrations
        await runMigration('v8', (schema as any).migrate_v8);
        await runMigration('v9', (schema as any).migrate_v9);
        await runMigration('v10', (schema as any).migrate_v10);

        // Initialize services with error handling
        console.log('[DB] Initializing services...');
        let exerciseService: ExerciseService;
        let workoutService: WorkoutService;
        let templateService: TemplateService;
        let publicationQueue: PublicationQueueService;
        let favoritesService: FavoritesService;
        let powrPackService: POWRPackService;
        
        try {
          exerciseService = new ExerciseService(db);
          console.log('[DB] ExerciseService initialized');
        } catch (error) {
          console.error('[DB] Failed to initialize ExerciseService:', error);
          throw new Error('Failed to initialize ExerciseService');
        }
        
        try {
          workoutService = new WorkoutService(db);
          console.log('[DB] WorkoutService initialized');
        } catch (error) {
          console.error('[DB] Failed to initialize WorkoutService:', error);
          throw new Error('Failed to initialize WorkoutService');
        }
        
        try {
          templateService = new TemplateService(db, exerciseService);
          console.log('[DB] TemplateService initialized');
        } catch (error) {
          console.error('[DB] Failed to initialize TemplateService:', error);
          throw new Error('Failed to initialize TemplateService');
        }
        
        try {
          publicationQueue = new PublicationQueueService(db);
          console.log('[DB] PublicationQueueService initialized');
        } catch (error) {
          console.error('[DB] Failed to initialize PublicationQueueService:', error);
          throw new Error('Failed to initialize PublicationQueueService');
        }
        
        try {
          favoritesService = new FavoritesService(db);
          console.log('[DB] FavoritesService initialized');
        } catch (error) {
          console.error('[DB] Failed to initialize FavoritesService:', error);
          throw new Error('Failed to initialize FavoritesService');
        }
        
        try {
          powrPackService = new POWRPackService(db);
          console.log('[DB] POWRPackService initialized');
        } catch (error) {
          console.error('[DB] Failed to initialize POWRPackService:', error);
          throw new Error('Failed to initialize POWRPackService');
        }
        
        // Initialize the favorites service
        try {
          await favoritesService.initialize();
          console.log('[DB] FavoritesService fully initialized');
        } catch (error) {
          console.error('[DB] Error initializing FavoritesService:', error);
          // Continue even if favorites initialization fails
        }
        
        // Initialize NDK on services if available
        if (ndk) {
          publicationQueue.setNDK(ndk);
        }

        // Set services
        setServices({
          exerciseService,
          workoutService,
          templateService,
          publicationQueue,
          favoritesService,
          powrPackService,
          db,
        });
        
        // Display database info in development mode
        if (__DEV__) {
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
