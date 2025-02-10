// tests/type-test.ts (just to verify types)
import { BaseExercise } from '@/types/exercise';
import { StorageSource } from '@/types/shared';

// This should compile if our types are correct
const testExercise: BaseExercise = {
  // SyncableContent properties
  id: 'test-id',
  created_at: Date.now(),
  availability: {
    source: ['local' as StorageSource]
  },

  // BaseExercise properties
  title: 'Test Exercise',
  type: 'strength',
  category: 'Push',
  tags: [],
};