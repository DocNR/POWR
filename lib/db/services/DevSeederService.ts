// lib/db/services/DevSeederService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { ExerciseService } from './ExerciseService';
import { logDatabaseInfo } from '../debug';
import { mockExerciseEvents, convertNostrToExercise } from '../../mocks/exercises';
import NDK, { NDKEvent } from '@nostr-dev-kit/ndk-mobile';

export class DevSeederService {
  private db: SQLiteDatabase;
  private exerciseService: ExerciseService;
  private ndk: NDK | null = null;

  constructor(
    db: SQLiteDatabase, 
    exerciseService: ExerciseService
  ) {
    this.db = db;
    this.exerciseService = exerciseService;
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
        return;
      }

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
            if (this.ndk) {
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
          }
          
          // Create exercise from the mock data regardless of NDK availability
          const exercise = convertNostrToExercise(eventData);
          await this.exerciseService.createExercise(exercise, true);
        }

        console.log('Successfully seeded', mockExerciseEvents.length, 'exercises');
      });

      // Log final database state
      await logDatabaseInfo();

    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  }

  async clearDatabase() {
    if (!__DEV__) return;

    try {
      console.log('Clearing development database...');

      await this.db.withTransactionAsync(async () => {
        const tables = [
          'exercises',
          'exercise_tags',
          'nostr_events',
          'event_tags',
          'cache_metadata',
          'ndk_cache' // Add the NDK Mobile cache table
        ];

        for (const table of tables) {
          await this.db.runAsync(`DELETE FROM ${table}`);
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