// types/library.ts
interface TemplateExercise {
    title: string;
    targetSets: number;
    targetReps: number;
  }

  export type TemplateType = 'strength' | 'circuit' | 'emom' | 'amrap';
  export type TemplateCategory = 'Full Body' | 'Custom' | 'Push/Pull/Legs' | 'Upper/Lower' | 'Conditioning'; 
  export type ContentSource = 'local' | 'powr' | 'nostr';
  
  export interface Template {
    id: string;
    title: string;
    type: TemplateType;
    category: TemplateCategory;
    exercises: Array<{
      title: string;
      targetSets: number;
      targetReps: number;
    }>;
    description?: string;
    tags: string[];
    source: ContentSource;
    isFavorite?: boolean;
    lastUsed?: Date;
  }

export interface FilterOptions {
  equipment: string[];
  tags: string[];
  source: ContentSource[];
}

export type ExerciseType = 'strength' | 'cardio' | 'bodyweight';
export type ExerciseCategory = 'Push' | 'Pull' | 'Legs' | 'Core';
export type ExerciseEquipment = 'bodyweight' | 'barbell' | 'dumbbell' | 'kettlebell' | 'machine' | 'cable' | 'other';

export interface Exercise {
  id: string;
  title: string;
  category: ExerciseCategory;
  type?: ExerciseType;
  equipment?: ExerciseEquipment;
  description?: string;
  tags: string[];
  source: ContentSource;
  usageCount?: number;
  lastUsed?: Date;
}