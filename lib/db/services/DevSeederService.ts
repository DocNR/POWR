// lib/db/services/DevSeederService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { ExerciseService } from './ExerciseService';
import { EventCache } from './EventCache';
import { logDatabaseInfo } from '../debug';
import { mockExerciseEvents, convertNostrToExercise } from '../../mocks/exercises';

export class DevSeederService {
  private db: SQLiteDatabase;
  private exerciseService: ExerciseService;
  private eventCache: EventCache;

  constructor(
    db: SQLiteDatabase, 
    exerciseService: ExerciseService,
    eventCache: EventCache
  ) {
    this.db = db;
    this.exerciseService = exerciseService;
    this.eventCache = eventCache;
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
        for (const event of mockExerciseEvents) {
          // Pass true to indicate we're in a transaction
          await this.eventCache.setEvent(event, true);
          const exercise = convertNostrToExercise(event);
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
          'cache_metadata'
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