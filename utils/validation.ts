// utils/validation.ts
import { NostrEvent, NostrEventKind, NostrTag, getTagValue, getTagValues } from '@/types/events';

function validateBasicEventStructure(event: NostrEvent): boolean {
  return !!(event.id && 
    event.pubkey && 
    event.kind && 
    event.created_at && 
    Array.isArray(event.tags));
}

function validateExerciseTag(tag: NostrTag): boolean {
  // Exercise tag format: ['exercise', id, type, category, setsData]
  if (tag.length < 5) return false;
  
  try {
    const setsData = JSON.parse(tag[4]);
    return Array.isArray(setsData) && setsData.every(set => 
      typeof set === 'object' && 
      ('weight' in set || 'reps' in set || 'type' in set)
    );
  } catch {
    return false;
  }
}

export function validateNostrExerciseEvent(event: NostrEvent): boolean {
  if (!validateBasicEventStructure(event)) return false;
  if (event.kind !== NostrEventKind.EXERCISE_TEMPLATE) return false;

  const requiredTags = ['d', 'name', 'type', 'category'];
  const tagMap = new Set(event.tags.map(tag => tag[0]));
  
  if (!requiredTags.every(tag => tagMap.has(tag))) return false;

  const format = getTagValue(event.tags, 'format');
  if (format) {
    try {
      const formatObj = JSON.parse(format);
      if (typeof formatObj !== 'object') return false;
    } catch {
      return false;
    }
  }

  return true;
}

export function validateNostrTemplateEvent(event: NostrEvent): boolean {
  if (!validateBasicEventStructure(event)) return false;
  if (event.kind !== NostrEventKind.WORKOUT_TEMPLATE) return false;

  const requiredTags = ['d', 'title', 'type', 'category'];
  const tagMap = new Set(event.tags.map(tag => tag[0]));
  
  if (!requiredTags.every(tag => tagMap.has(tag))) return false;

  // Validate exercise tags
  const exerciseTags = event.tags.filter(tag => tag[0] === 'exercise');
  if (exerciseTags.length === 0) return false;
  
  return exerciseTags.every(validateExerciseTag);
}

export function validateNostrWorkoutEvent(event: NostrEvent): boolean {
  if (!validateBasicEventStructure(event)) return false;
  if (event.kind !== NostrEventKind.WORKOUT_RECORD) return false;

  const requiredTags = ['d', 'title', 'type', 'start', 'end', 'completed'];
  const tagMap = new Set(event.tags.map(tag => tag[0]));
  
  if (!requiredTags.every(tag => tagMap.has(tag))) return false;

  // Validate timestamps
  const start = parseInt(getTagValue(event.tags, 'start') || '');
  const end = parseInt(getTagValue(event.tags, 'end') || '');
  if (isNaN(start) || isNaN(end) || start > end) return false;

  // Validate exercise tags
  const exerciseTags = event.tags.filter(tag => tag[0] === 'exercise');
  if (exerciseTags.length === 0) return false;
  
  return exerciseTags.every(validateExerciseTag);
}