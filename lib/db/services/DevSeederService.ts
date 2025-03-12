// lib/db/services/DevSeederService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { ExerciseService } from './ExerciseService';
import { EventCache } from '@/lib/db/services/EventCache';
import { WorkoutService } from './WorkoutService';
import { TemplateService } from './TemplateService';
import { logDatabaseInfo } from '../debug';
import { mockExerciseEvents, convertNostrToExercise } from '../../mocks/exercises';
import { DbService } from '../db-service';
import NDK, { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { NostrEvent } from '@/types/nostr'; // Assuming you have this type defined

export class DevSeederService {
  private db: SQLiteDatabase;
  private dbService: DbService;
  private exerciseService: ExerciseService;
  private workoutService: WorkoutService | null = null;
  private templateService: TemplateService | null = null;
  private eventCache: EventCache | null = null;
  private ndk: NDK | null = null;

  constructor(
    db: SQLiteDatabase, 
    exerciseService: ExerciseService
  ) {
    this.db = db;
    this.dbService = new DbService(db);
    this.exerciseService = exerciseService;
    
    // Try to initialize other services if needed
    try {
      this.workoutService = new WorkoutService(db);
      this.templateService = new TemplateService(db);
      this.eventCache = new EventCache(db);
    } catch (error) {
      console.log('Some services not available yet:', error);
    }
  }

  setNDK(ndk: NDK) {
    this.ndk = ndk;
  }

  async seedDatabase() {
    if (!__DEV__) return;

    try {
      console.log('Starting development database seeding...');

      // Log initial database state
      await logDatabaseInfo();

      // Check if we already have exercises
      const existingCount = (await this.exerciseService.getAllExercises()).length;
      
      if (existingCount > 0) {
        console.log('Database already seeded with', existingCount, 'exercises');
      } else {
        // Start transaction for all seeding operations
        await this.db.withTransactionAsync(async () => {
          console.log('Seeding mock exercises...');
  
          // Process all events within the same transaction
          for (const eventData of mockExerciseEvents) {
            if (this.ndk) {
              // If NDK is available, use it to cache the event
              const event = new NDKEvent(this.ndk);
              Object.assign(event, eventData);
              
              // Cache the event in NDK
              const ndkEvent = new NDKEvent(this.ndk);
              
              // Copy event properties
              ndkEvent.kind = eventData.kind;
              ndkEvent.content = eventData.content;
              ndkEvent.created_at = eventData.created_at;
              ndkEvent.tags = eventData.tags;
              
              // If we have mock signatures, use them
              if (eventData.sig) {
                ndkEvent.sig = eventData.sig;
                ndkEvent.id = eventData.id || '';  
                ndkEvent.pubkey = eventData.pubkey || '';  
              } else if (this.ndk.signer) {
                // Otherwise sign if possible
                await ndkEvent.sign();
              }
            }
            
            // Cache the event if possible
            if (this.eventCache) {
              try {
                await this.eventCache.setEvent(eventData, true);
              } catch (error) {
                console.log('Error caching event:', error);
              }
            }
            
            // Create exercise from the mock data regardless of NDK availability
            const exercise = convertNostrToExercise(eventData);
            await this.exerciseService.createExercise(exercise, true);
          }
  
          console.log('Successfully seeded', mockExerciseEvents.length, 'exercises');
        });
      }

      // Seed workout and template tables
      await this.seedWorkoutTables();
      await this.seedTemplates();

      // Log final database state
      await logDatabaseInfo();

    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  }

  async seedWorkoutTables() {
    if (!__DEV__) return;

    try {
      console.log('Checking workout tables seeding...');

      // Check if we already have workout data
      try {
        const hasWorkouts = await this.dbService.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM workouts'
        );
        
        if (hasWorkouts && hasWorkouts.count > 0) {
          console.log('Workout tables already seeded with', hasWorkouts.count, 'workouts');
          return;
        }

        console.log('No workout data found, but tables should be created');
        
        // Optional: Add mock workout data here
        // if (this.workoutService) {
        //   // Create mock workouts
        //   // await this.workoutService.saveWorkout(mockWorkout);
        // }
      } catch (error) {
        console.log('Workout tables may not exist yet - will be created in schema update');
      }
    } catch (error) {
      console.error('Error checking workout tables:', error);
    }
  }

  async seedTemplates() {
    if (!__DEV__) return;

    try {
      console.log('Checking template tables seeding...');

      // Check if templates table exists and has data
      try {
        const hasTemplates = await this.dbService.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM templates'
        );
        
        if (hasTemplates && hasTemplates.count > 0) {
          console.log('Template tables already seeded with', hasTemplates.count, 'templates');
          return;
        }
        
        console.log('No template data found, but tables should be created');
        
        // Optional: Add mock template data here
        // if (this.templateService) {
        //   // Create mock templates
        //   // await this.templateService.createTemplate(mockTemplate);
        // }
      } catch (error) {
        console.log('Template tables may not exist yet - will be created in schema update');
      }
    } catch (error) {
      console.error('Error checking template tables:', error);
    }
  }

  /**
   * Seed the database with real events from Nostr relays instead of mock data
   * @param filter The filter to use when fetching events from relays
   * @param limit Maximum number of events to seed (optional)
   */
  async seedFromNostr(filter: any, limit?: number) {
    if (!this.ndk) {
      console.log('NDK not available for seeding from Nostr');
      return;
    }

    try {
      console.log(`Seeding from Nostr with filter:`, filter);
      
      // Fetch events from relays
      const events = await this.ndk.fetchEvents(filter);
      
      console.log(`Found ${events.size} events on Nostr`);
      
      // Convert to array and limit if needed
      const eventsArray = Array.from(events);
      const eventsToProcess = limit ? eventsArray.slice(0, limit) : eventsArray;
      
      // Process each event individually
      let successCount = 0;
      
      for (const ndkEvent of eventsToProcess) {
        try {
          // Convert NDKEvent to your NostrEvent format
          const nostrEvent: NostrEvent = {
            id: ndkEvent.id || '',
            pubkey: ndkEvent.pubkey || '',
            created_at: ndkEvent.created_at || 0, // Set a default value of 0 if undefined
            kind: ndkEvent.kind || 0,
            tags: ndkEvent.tags || [],
            content: ndkEvent.content || '',
            sig: ndkEvent.sig || ''
          };
          
          // Cache the event
          if (this.eventCache) {
            await this.eventCache.setEvent(nostrEvent, true);
          }
          
          // Process based on kind
          if (ndkEvent.kind === 33401) { // Exercise
            const exercise = convertNostrToExercise(nostrEvent);
            await this.exerciseService.createExercise(exercise, true);
            successCount++;
          } 
          // Add more event type processing here as needed
          
        } catch (error) {
          console.error(`Error processing Nostr event:`, error);
          // Continue with next event
        }
      }
      
      console.log(`Successfully seeded ${successCount} items from Nostr`);
      
    } catch (error) {
      console.error('Error seeding from Nostr:', error);
    }
  }

  async clearDatabase() {
    if (!__DEV__) return;

    try {
      console.log('Clearing development database...');

      await this.db.withTransactionAsync(async () => {
        const tables = [
          // Original tables
          'exercises',
          'exercise_tags',
          'nostr_events',
          'event_tags',
          'cache_metadata',
          'ndk_cache',
          
          // New tables
          'workouts',
          'workout_exercises',
          'workout_sets',
          'templates',
          'template_exercises'
        ];

        for (const table of tables) {
          try {
            await this.db.runAsync(`DELETE FROM ${table}`);
            console.log(`Cleared table: ${table}`);
          } catch (error) {
            console.log(`Table ${table} might not exist yet, skipping`);
          }
        }
      });

      console.log('Successfully cleared database');
    } catch (error) {
      console.error('Error clearing database:', error);
      throw error;
    }
  }

  async resetDatabase() {
    if (!__DEV__) return;
    
    await this.clearDatabase();
    await this.seedDatabase();
  }
}