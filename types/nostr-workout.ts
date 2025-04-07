// types/nostr-workout.ts
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';

// Event kind definitions for POWR app
export const POWR_EVENT_KINDS = {
  EXERCISE_TEMPLATE: 33401,
  WORKOUT_TEMPLATE: 33402,
  WORKOUT_RECORD: 1301,
  SOCIAL_POST: 1,
  COMMENT: 1111,
  REACTION: 7,
  LONG_FORM_CONTENT: 30023,
  DRAFT_CONTENT: 30024,
};

// Interface for parsed workout record
export interface ParsedWorkoutRecord {
  id: string;
  title: string;
  type: string;
  startTime: number;
  endTime?: number;
  completed: boolean;
  exercises: ParsedExercise[];
  templateReference?: string;
  notes: string;
  author: string;
  createdAt: number;
}

// Interface for parsed exercise
export interface ParsedExercise {
  id: string;
  name: string;
  weight?: number;
  reps?: number;
  rpe?: number;
  setType?: string;
}

// Interface for parsed exercise template
export interface ParsedExerciseTemplate {
  id: string;
  title: string;
  equipment?: string;
  difficulty?: string;
  description: string;
  format: string[];
  formatUnits: string[];
  tags: string[];
  author: string;
  createdAt: number;
}

// Interface for parsed workout template
export interface ParsedWorkoutTemplate {
  id: string;
  title: string;
  type: string;
  description: string;
  rounds?: number;
  duration?: number;
  interval?: number;
  restBetweenRounds?: number;
  exercises: ParsedTemplateExercise[];
  tags: string[];
  author: string;
  createdAt: number;
}

// Interface for exercise reference in template
export interface ParsedTemplateExercise {
  reference: string;
  params: string[];
  name?: string; // Resolved name if available
}

// Interface for parsed social post
export interface ParsedSocialPost {
  id: string;
  content: string;
  author: string;
  quotedContent?: {
    id: string;
    kind: number;
    type: 'workout' | 'exercise' | 'template' | 'article';
    resolved?: ParsedWorkoutRecord | ParsedExerciseTemplate | ParsedWorkoutTemplate | ParsedLongformContent;
  };
  tags: string[];
  createdAt: number;
}

// Interface for parsed long-form content (NIP-23)
export interface ParsedLongformContent {
  id: string;
  title: string;
  content: string;
  summary?: string;
  image?: string;
  publishedAt: number;
  tags: string[];
  author: string;
  createdAt: number;
}

// Helper function to extract tag value from event
export function findTagValue(tags: string[][], name: string): string | undefined {
  const tag = tags.find(t => t[0] === name);
  return tag ? tag[1] : undefined;
}

// Function to parse workout record event
export function parseWorkoutRecord(event: NDKEvent): ParsedWorkoutRecord {
  const title = findTagValue(event.tags, 'title') || 'Untitled Workout';
  const type = findTagValue(event.tags, 'type') || 'strength';
  const startTimeStr = findTagValue(event.tags, 'start');
  const endTimeStr = findTagValue(event.tags, 'end');
  const completedStr = findTagValue(event.tags, 'completed');
  
  const startTime = startTimeStr ? parseInt(startTimeStr) * 1000 : Date.now();
  const endTime = endTimeStr && endTimeStr !== '' ? parseInt(endTimeStr) * 1000 : undefined;
  const completed = completedStr === 'true';
  
  // Extract exercises from tags
  const exercises: ParsedExercise[] = event.tags
    .filter(tag => tag[0] === 'exercise')
    .map(tag => {
      // Format: ['exercise', '<kind>:<pubkey>:<d-tag>', '<relay-url>', '<weight>', '<reps>', '<rpe>', '<set_type>']
      const reference = tag[1] || '';
      const parts = reference.split(':');
      
      const id = parts.length > 2 ? parts[2] : reference;
      // Get a basic name, will be improved by lookupExerciseTitle in UI components
      const name = extractExerciseName(reference);
      
      return {
        id,
        name,
        weight: tag[3] ? parseFloat(tag[3]) : undefined,
        reps: tag[4] ? parseInt(tag[4]) : undefined,
        rpe: tag[5] ? parseFloat(tag[5]) : undefined,
        setType: tag[6] || 'normal'
      };
    });
  
  // Get template reference if available
  const templateTag = event.tags.find(tag => tag[0] === 'template');
  const templateReference = templateTag ? templateTag[1] : undefined;
  
  // Extract tags
  const tags = event.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1]);
  
  return {
    id: event.id || '',
    title,
    type,
    startTime,
    endTime,
    completed,
    exercises,
    templateReference,
    notes: event.content,
    author: event.pubkey || '',
    createdAt: event.created_at ? event.created_at * 1000 : Date.now()
  };
}

// Function to parse exercise template event
export function parseExerciseTemplate(event: NDKEvent): ParsedExerciseTemplate {
  const title = findTagValue(event.tags, 'title') || 'Untitled Exercise';
  const equipment = findTagValue(event.tags, 'equipment');
  const difficulty = findTagValue(event.tags, 'difficulty');
  
  // Parse format and format units
  const formatTag = event.tags.find(tag => tag[0] === 'format');
  const formatUnitsTag = event.tags.find(tag => tag[0] === 'format_units');
  
  const format = formatTag ? formatTag.slice(1) : [];
  const formatUnits = formatUnitsTag ? formatUnitsTag.slice(1) : [];
  
  // Extract tags
  const tags = event.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1]);
  
  return {
    id: event.id || '',
    title,
    equipment,
    difficulty,
    description: event.content,
    format,
    formatUnits,
    tags,
    author: event.pubkey || '',
    createdAt: event.created_at ? event.created_at * 1000 : Date.now()
  };
}

// Function to parse workout template event
export function parseWorkoutTemplate(event: NDKEvent): ParsedWorkoutTemplate {
  const title = findTagValue(event.tags, 'title') || 'Untitled Template';
  const type = findTagValue(event.tags, 'type') || 'strength';
  const roundsStr = findTagValue(event.tags, 'rounds');
  const durationStr = findTagValue(event.tags, 'duration');
  const intervalStr = findTagValue(event.tags, 'interval');
  const restStr = findTagValue(event.tags, 'rest_between_rounds');
  
  // Parse numeric values
  const rounds = roundsStr ? parseInt(roundsStr) : undefined;
  const duration = durationStr ? parseInt(durationStr) : undefined;
  const interval = intervalStr ? parseInt(intervalStr) : undefined;
  const restBetweenRounds = restStr ? parseInt(restStr) : undefined;
  
  // Extract exercise references
  const exercises = event.tags
    .filter(tag => tag[0] === 'exercise')
    .map(tag => {
      // Format: ['exercise', '<kind>:<pubkey>:<d-tag>', '<relay-url>', '<param1>', '<param2>', ...]
      return {
        reference: tag[1] || '',
        params: tag.slice(3),
        name: extractExerciseName(tag[1])
      };
    });
  
  // Extract tags
  const tags = event.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1]);
  
  return {
    id: event.id || '',
    title,
    type,
    description: event.content,
    rounds,
    duration,
    interval,
    restBetweenRounds,
    exercises,
    tags,
    author: event.pubkey || '',
    createdAt: event.created_at ? event.created_at * 1000 : Date.now()
  };
}

// Function to parse social post that may quote workout content
export function parseSocialPost(event: NDKEvent): ParsedSocialPost {
  // Get basic post info
  const content = event.content;
  const author = event.pubkey || '';
  
  // Extract tags
  const tags = event.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1]);
  
  // Find quoted content
  const quoteTag = event.tags.find(tag => tag[0] === 'q');
  const kindTag = event.tags.find(tag => 
    tag[0] === 'k' && 
    ['1301', '33401', '33402', '30023'].includes(tag[1])
  );
  
  let quotedContent = undefined;
  
  if (quoteTag && kindTag) {
    const quotedEventId = quoteTag[1];
    const quotedEventKind = parseInt(kindTag[1]);
    
    // Determine the type of quoted content
    let contentType: 'workout' | 'exercise' | 'template' | 'article';
    
    switch (quotedEventKind) {
      case 1301:
        contentType = 'workout';
        break;
      case 33401:
        contentType = 'exercise';
        break;
      case 33402:
        contentType = 'template';
        break;
      case 30023:
      case 30024:
        contentType = 'article';
        break;
      default:
        contentType = 'workout'; // Default fallback
    }
    
    quotedContent = {
      id: quotedEventId,
      kind: quotedEventKind,
      type: contentType,
    };
  }
  
  // Also check for a-tags which can reference addressable content
  if (!quotedContent) {
    const aTag = event.tags.find(tag => 
      tag[0] === 'a' && 
      tag[1] && 
      (tag[1].startsWith('30023:') || 
       tag[1].startsWith('33401:') || 
       tag[1].startsWith('33402:') || 
       tag[1].startsWith('1301:'))
    );
    
    if (aTag && aTag[1]) {
      const parts = aTag[1].split(':');
      if (parts.length >= 3) {
        const quotedEventKind = parseInt(parts[0]);
        const quotedId = aTag[1]; // Use the full reference for addressable events
        
        // Determine the type of quoted content
        let contentType: 'workout' | 'exercise' | 'template' | 'article';
        
        switch (quotedEventKind) {
          case 1301:
            contentType = 'workout';
            break;
          case 33401:
            contentType = 'exercise';
            break;
          case 33402:
            contentType = 'template';
            break;
          case 30023:
          case 30024:
            contentType = 'article';
            break;
          default:
            contentType = 'workout'; // Default fallback
        }
        
        quotedContent = {
          id: quotedId,
          kind: quotedEventKind,
          type: contentType,
        };
      }
    }
  }
  
  return {
    id: event.id || '',
    content,
    author,
    quotedContent,
    tags,
    createdAt: event.created_at ? event.created_at * 1000 : Date.now()
  };
}

// Function to parse long-form content (NIP-23)
export function parseLongformContent(event: NDKEvent): ParsedLongformContent {
  // Extract title from tags
  const title = findTagValue(event.tags, 'title') || 'Untitled Article';
  
  // Extract image URL if available
  const image = findTagValue(event.tags, 'image');
  
  // Extract summary if available
  const summary = findTagValue(event.tags, 'summary');
  
  // Extract published date (or use created_at)
  const publishedAtTag = findTagValue(event.tags, 'published_at');
  const publishedAt = publishedAtTag ? parseInt(publishedAtTag) : 
                      (event.created_at || Math.floor(Date.now() / 1000));
  
  // Extract hashtags
  const tags = event.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1]);
  
  return {
    id: event.id || '',
    title,
    content: event.content,
    summary,
    image,
    publishedAt,
    tags,
    author: event.pubkey || '',
    createdAt: event.created_at ? event.created_at : Math.floor(Date.now() / 1000)
  };
}

// Extract exercise name from reference 
export function extractExerciseName(reference: string): string {
  if (!reference) return 'Exercise';
  
  // Handle the "local:" prefix pattern seen in logs (e.g., "local:m94c2cm7-mrhvwgfcr0b")
  if (reference.startsWith('local:')) {
    const localIdentifier = reference.substring(6); // Remove "local:" prefix
    
    // Use the UUID pattern for local IDs
    if (localIdentifier.includes('-')) {
      const parts = localIdentifier.split('-');
      if (parts.length === 2) {
        // Format might be something like "m94c2cm7-mrhvwgfcr0b"
        return `Exercise ${parts[0].substring(0, 4)}`;
      }
    }
  }
  
  // Split the reference to get the parts for standard format
  const parts = reference.split(':');
  
  // Get the identifier part (usually the last part)
  let identifier = '';
  if (parts.length > 2) {
    identifier = parts[2];
  } else if (reference) {
    identifier = reference;
  }
  
  // Enhanced naming detection for common exercises
  
  // Bench variations
  if (identifier.match(/bench[-_]?press/i) || 
      identifier.match(/chest[-_]?press/i)) return 'Bench Press';
  
  // Squat variations
  if (identifier.match(/squat/i)) {
    if (identifier.match(/front/i)) return 'Front Squat';
    if (identifier.match(/back/i)) return 'Back Squat';
    if (identifier.match(/goblet/i)) return 'Goblet Squat';
    return 'Squat';
  }
  
  // Deadlift variations
  if (identifier.match(/deadlift/i)) {
    if (identifier.match(/romanian/i) || identifier.match(/rdl/i)) return 'Romanian Deadlift';
    if (identifier.match(/stiff[-_]?leg/i) || identifier.match(/sldl/i)) return 'Stiff-Leg Deadlift';
    if (identifier.match(/sumo/i)) return 'Sumo Deadlift';
    return 'Deadlift';
  }
  
  // Press variations
  if (identifier.match(/shoulder[-_]?press/i) || 
      identifier.match(/overhead[-_]?press/i) || 
      identifier.match(/ohp/i)) return 'Shoulder Press';
  
  // Pull variations  
  if (identifier.match(/pull[-_]?up/i)) return 'Pull Up';
  if (identifier.match(/chin[-_]?up/i)) return 'Chin Up';
  
  // Push variations
  if (identifier.match(/push[-_]?up/i)) return 'Push Up';
  if (identifier.match(/dip/i)) return 'Dip';
  
  // Row variations
  if (identifier.match(/row/i)) {
    if (identifier.match(/barbell/i)) return 'Barbell Row';
    if (identifier.match(/dumbbell/i) || identifier.match(/db/i)) return 'Dumbbell Row';
    return 'Row';
  }
  
  // Back exercises
  if (identifier.match(/lat[-_]?pulldown/i) || identifier.match(/lat[-_]?pull/i)) return 'Lat Pulldown';
  
  // Arm exercises
  if (identifier.match(/bicep[-_]?curl/i) || identifier.match(/curl/i)) return 'Bicep Curl';
  if (identifier.match(/tricep/i)) {
    if (identifier.match(/extension/i)) return 'Tricep Extension';
    if (identifier.match(/pushdown/i)) return 'Tricep Pushdown';
    return 'Tricep Exercise';
  }
  
  // Leg exercises
  if (identifier.match(/leg[-_]?press/i)) return 'Leg Press';
  if (identifier.match(/leg[-_]?curl/i)) return 'Leg Curl';
  if (identifier.match(/leg[-_]?ext/i)) return 'Leg Extension';
  if (identifier.match(/calf[-_]?raise/i)) return 'Calf Raise';
  if (identifier.match(/lunge/i)) return 'Lunge';
  
  // Core exercises
  if (identifier.match(/plank/i)) return 'Plank';
  if (identifier.match(/crunch/i)) return 'Crunch';
  if (identifier.match(/sit[-_]?up/i)) return 'Sit Up';
  
  // If the ID appears to contain a name with dashes or underscores
  if (identifier.includes('-') || identifier.includes('_')) {
    // Extract name parts and create a more readable name
    const words = identifier.split(/[-_]/).filter(word => /^[a-zA-Z]+$/.test(word));
    if (words.length > 0) {
      return words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }
  }
  
    // For POWR's specific ID format: mXXXXXXX-XXXXXXXXXX
    if (identifier.match(/^m[a-z0-9]{7}-[a-z0-9]{10}$/i)) {
      // This matches patterns like "m8l428e1-3yedofspbpy"
      // Get the first 4 characters after 'm' and capitalize
      return `Exercise ${identifier.substring(1, 5).toUpperCase()}`;
    }
    
    // For UUIDs and other random IDs
    if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return 'Exercise';  // Will be resolved by lookupExerciseTitle later
    }
  
  // For any unrecognized format with alphabetic characters, try to make it readable
  if (/[a-zA-Z]/.test(identifier)) {
    // Break camelCase
    const nameParts = identifier.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
    return nameParts.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
  }
  
  // Last resort fallback
  return 'Exercise';
}

// Global variable to store a database connection that can be set from outside
let _dbConnection: any = null;

// Function to set the database connection from outside this module
export function setDatabaseConnection(db: any) {
  _dbConnection = db;
}

// Function to look up an exercise title from the database
export async function lookupExerciseTitle(exerciseId: string): Promise<string | null> {
  try {
    if (!_dbConnection) {
      console.warn('No DB connection available for exercise title lookup');
      return null;
    }
    
    // Query the database for the exercise title
    const exercise = await _dbConnection.getFirstAsync(
      `SELECT title FROM exercises WHERE id = ?`,
      [exerciseId]
    );
    
    if (exercise && typeof exercise.title === 'string') {
      return exercise.title;
    }
    
    return null;
  } catch (error) {
    console.error('Error looking up exercise title:', error);
    return null;
  }
}
