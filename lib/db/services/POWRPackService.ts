// lib/db/services/POWRPackService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk-mobile';
import { nip19 } from 'nostr-tools';
import { generateId } from '@/utils/ids';
import { NostrIntegration } from './NostrIntegration';
import { POWRPack, POWRPackImport, POWRPackSelection, POWRPackWithContent } from '@/types/powr-pack';
import { 
  BaseExercise, 
  ExerciseType, 
  ExerciseCategory 
} from '@/types/exercise';
import { 
  WorkoutTemplate, 
  TemplateType 
} from '@/types/templates';
import '@/types/ndk-extensions';
import { safeAddRelay, safeRemoveRelay } from '@/types/ndk-common';

/**
 * Service for managing POWR Packs (importable collections of templates and exercises)
 */
export default class POWRPackService {
  private db: SQLiteDatabase;
  private nostrIntegration: NostrIntegration;
  private exerciseWithRelays: Map<string, {event: NDKEvent, relays: string[]}> = new Map();
  
  constructor(db: SQLiteDatabase) {
    this.db = db;
    this.nostrIntegration = new NostrIntegration(db);
  }
  
   /**
   * Fetch a POWR Pack from a Nostr address (naddr)
   */
  async fetchPackFromNaddr(naddr: string, ndk: NDK): Promise<POWRPackImport> {
    try {
      console.log(`Fetching POWR Pack from naddr: ${naddr}`);
      
      // Validate naddr format
      if (!naddr.startsWith('naddr1')) {
        throw new Error('Invalid naddr format. Should start with "naddr1"');
      }
      
      // Decode naddr
      const decoded = nip19.decode(naddr);
      if (decoded.type !== 'naddr') {
        throw new Error('Invalid naddr format');
      }
      
      const { pubkey, kind, identifier, relays } = decoded.data;
      console.log(`Decoded naddr: pubkey=${pubkey}, kind=${kind}, identifier=${identifier}`);
      console.log(`Relay hints: ${relays ? relays.join(', ') : 'none'}`);
      
      // Track temporarily added relays
      const addedRelays = new Set<string>();
      
      // If relay hints are provided, add them to NDK's pool temporarily
      if (relays && relays.length > 0) {
        for (const relay of relays) {
          try {
            console.log(`Adding suggested relay: ${relay}`);
            // Use type assertion
            this.safeAddRelay(ndk, relay);
            addedRelays.add(relay);
          } catch (error) {
            console.warn(`Failed to add relay ${relay}:`, error);
          }
        }
      }
      
      // Create filter to fetch the pack event
      const packFilter: NDKFilter = {
        kinds: [kind],
        authors: [pubkey],
        '#d': identifier ? [identifier] : undefined
      };
      
      console.log(`Fetching pack with filter: ${JSON.stringify(packFilter)}`);
      
      // Fetch the pack event
      const events = await ndk.fetchEvents(packFilter);
      
      // Clean up - remove any temporarily added relays
      if (addedRelays.size > 0) {
        console.log(`Removing ${addedRelays.size} temporarily added relays`);
        for (const relay of addedRelays) {
          try {
            this.safeRemoveRelay(ndk, relay);
          } catch (err) {
            console.warn(`Failed to remove relay ${relay}:`, err);
          }
        }
      }
      
      if (events.size === 0) {
        throw new Error('Pack not found');
      }
      
      // Get the first matching event
      const packEvent = Array.from(events)[0];
      console.log(`Fetched pack event: ${packEvent.id}`);
      
      // Get tags for debugging
      console.log(`Pack tags: ${JSON.stringify(packEvent.tags)}`);
      
      // Extract template and exercise references
      const templateRefs: string[] = [];
      const exerciseRefs: string[] = [];
      
      // Use NDK's getMatchingTags for more reliable tag handling
      const aTags = packEvent.getMatchingTags('a');
      
      for (const tag of aTags) {
        if (tag.length < 2) continue;
        
        const addressPointer = tag[1];
        if (addressPointer.startsWith('33402:')) {
          console.log(`Found template reference: ${addressPointer}`);
          
          // Include any relay hints in the tag
          if (tag.length > 2) {
            const relayHints = tag.slice(2).filter(r => r.startsWith('wss://'));
            if (relayHints.length > 0) {
              templateRefs.push(`${addressPointer},${relayHints.join(',')}`);
              continue;
            }
          }
          
          templateRefs.push(addressPointer);
        } else if (addressPointer.startsWith('33401:')) {
          console.log(`Found exercise reference: ${addressPointer}`);
          
          // Include any relay hints in the tag
          if (tag.length > 2) {
            const relayHints = tag.slice(2).filter(r => r.startsWith('wss://'));
            if (relayHints.length > 0) {
              exerciseRefs.push(`${addressPointer},${relayHints.join(',')}`);
              continue;
            }
          }
          
          exerciseRefs.push(addressPointer);
        }
      }
      
      console.log(`Found ${templateRefs.length} template refs and ${exerciseRefs.length} exercise refs`);
      
      // Fetch referenced templates and exercises
      const templates = await this.fetchReferencedEvents(ndk, templateRefs);
      const exercises = await this.fetchReferencedEvents(ndk, exerciseRefs);
      
      console.log(`Fetched ${templates.length} templates and ${exercises.length} exercises`);
      
      return {
        packEvent,
        templates,
        exercises
      };
    } catch (error) {
      console.error('Error fetching pack from naddr:', error);
      throw error;
    }
  }
  
  /**
   * Fetch referenced events (templates or exercises)
   */
  async fetchReferencedEvents(ndk: NDK, refs: string[]): Promise<NDKEvent[]> {
    if (refs.length === 0) return [];
    
    console.log(`Fetching references: ${JSON.stringify(refs)}`);
    
    const events: NDKEvent[] = [];
    const addedRelays: Set<string> = new Set(); // Track temporarily added relays
    
    for (const ref of refs) {
      try {
        // Parse the reference format (kind:pubkey:d-tag,relay1,relay2)
        const parts = ref.split(',');
        const baseRef = parts[0];
        const relayHints = parts.slice(1).filter(r => r.startsWith('wss://'));
        
        const [kindStr, pubkey, dTag] = baseRef.split(':');
        const kind = parseInt(kindStr);
        
        console.log(`Fetching ${kind} event with d-tag ${dTag} from author ${pubkey}`);
        
        // Temporarily add these relays to NDK for this specific fetch
        if (relayHints.length > 0) {
          console.log(`With relay hints: ${relayHints.join(', ')}`);
          
          for (const relay of relayHints) {
            try {
              this.safeAddRelay(ndk, relay);
              addedRelays.add(relay);
            } catch (err) {
              console.warn(`Failed to add relay ${relay}:`, err);
            }
          }
        }
        
        // Create a filter to find this specific event
        const filter: NDKFilter = {
          kinds: [kind],
          authors: [pubkey],
          '#d': [dTag]
        };
        
        // Try to fetch by filter first
        const fetchedEvents = await ndk.fetchEvents(filter);
        
        if (fetchedEvents.size > 0) {
          const event = Array.from(fetchedEvents)[0];
          
          // Add the relay hints to the event for future reference
          if (relayHints.length > 0) {
            relayHints.forEach(relay => {
              // Check if the relay is already in tags
              const existingRelayTag = event.getMatchingTags('r').some(tag => 
                tag.length > 1 && tag[1] === relay
              );
              
              if (!existingRelayTag) {
                event.tags.push(['r', relay]);
              }
            });
          }
          
          events.push(event);
          continue;
        }
        
        // If not found by d-tag, try to fetch by ID directly
        console.log(`Trying to fetch event directly by ID: ${dTag}`);
        try {
          const event = await ndk.fetchEvent(dTag);
          if (event) {
            console.log(`Successfully fetched event by ID: ${dTag}`);
            
            // Add the relay hints to the event for future reference
            if (relayHints.length > 0) {
              relayHints.forEach(relay => {
                // Check if the relay is already in tags
                const existingRelayTag = event.getMatchingTags('r').some(tag => 
                  tag.length > 1 && tag[1] === relay
                );
                
                if (!existingRelayTag) {
                  event.tags.push(['r', relay]);
                }
              });
            }
            
            events.push(event);
          }
        } catch (idError) {
          console.error(`Error fetching by ID: ${idError}`);
        }
      } catch (error) {
        console.error(`Error fetching reference ${ref}:`, error);
      }
    }
    
    // Clean up - remove any temporarily added relays
    if (addedRelays.size > 0) {
      console.log(`Removing ${addedRelays.size} temporarily added relays`);
      for (const relay of addedRelays) {
        try {
          this.safeRemoveRelay(ndk, relay);
        } catch (err) {
          console.warn(`Failed to remove relay ${relay}:`, err);
        }
      }
    }
    
    console.log(`Total fetched referenced events: ${events.length}`);
    return events;
  }
  
  /**
   * Analyze dependencies between templates and exercises
   */
  analyzeDependencies(templates: NDKEvent[], exercises: NDKEvent[]): Record<string, string[]> {
    const dependencies: Record<string, string[]> = {};
    const exerciseMap = new Map<string, NDKEvent>();
    const exerciseWithRelays = new Map<string, {event: NDKEvent, relays: string[]}>();
    
    // Map exercises by "kind:pubkey:d-tag" for easier lookup, preserving relay hints
    for (const exercise of exercises) {
      const dTag = exercise.tagValue('d');
      if (dTag) {
        const reference = `33401:${exercise.pubkey}:${dTag}`;
        exerciseMap.set(reference, exercise);
        
        // Extract relay hints from event if available
        const relays: string[] = [];
        exercise.getMatchingTags('r').forEach(tag => {
          if (tag.length > 1 && tag[1].startsWith('wss://')) {
            relays.push(tag[1]);
          }
        });
        
        // Store event with its relay hints
        exerciseWithRelays.set(reference, {event: exercise, relays});
        
        console.log(`Mapped exercise ${exercise.id} to reference ${reference} with ${relays.length} relay hints`);
      }
    }
    
    // Analyze each template for its exercise dependencies
    for (const template of templates) {
      const templateId = template.id;
      const templateName = template.tagValue('title') || 'Unnamed Template';
      
      console.log(`Analyzing template ${templateName} (${templateId})`);
      dependencies[templateId] = [];
      
      // Get exercise references from template
      const exerciseTags = template.getMatchingTags('exercise');
      
      for (const tag of exerciseTags) {
        if (tag.length < 2) continue;
        
        // Parse the full reference with potential relay hints
        const fullRef = tag[1];
        
        // Split the reference to handle parameters first
        const refWithParams = fullRef.split(',')[0]; // Get reference part without relay hints
        const baseRef = refWithParams.split('::')[0]; // Extract base reference without parameters
        
        // Extract relay hints from the comma-separated list
        const relayHintsFromCommas = fullRef.split(',').slice(1).filter(r => r.startsWith('wss://'));
        
        // Also check for relay hints in additional tag elements
        const relayHintsFromTag = tag.slice(2).filter(item => item.startsWith('wss://'));
        
        // Combine all relay hints
        const relayHints = [...relayHintsFromCommas, ...relayHintsFromTag];
        
        console.log(`Template ${templateName} references ${refWithParams} with ${relayHints.length} relay hints`);
        
        // Find the exercise in our mapped exercises using only the base reference
        const exercise = exerciseMap.get(baseRef);
        if (exercise) {
          dependencies[templateId].push(exercise.id);
          
          // Add any relay hints to our stored exercise data
          const existingData = exerciseWithRelays.get(baseRef);
          if (existingData && relayHints.length > 0) {
            // Merge relay hints without duplicates
            const uniqueRelays = new Set([...existingData.relays, ...relayHints]);
            exerciseWithRelays.set(baseRef, {
              event: existingData.event,
              relays: Array.from(uniqueRelays)
            });
            
            console.log(`Updated relay hints for ${baseRef}: ${Array.from(uniqueRelays).join(', ')}`);
          }
          
          console.log(`Template ${templateName} depends on exercise ${exercise.id}`);
        } else {
          console.log(`Template ${templateName} references unknown exercise ${refWithParams}`);
        }
      }
      
      console.log(`Template ${templateName} has ${dependencies[templateId].length} dependencies`);
    }
    
    // Store the enhanced exercise mapping with relay hints in a class property
    this.exerciseWithRelays = exerciseWithRelays;
    
    return dependencies;
  }

  // Inside your POWRPackService class
  private safeAddRelay(ndk: NDK, url: string): void {
    try {
      // Direct property access to check if method exists
      if (typeof (ndk as any).addRelay === 'function') {
        (ndk as any).addRelay(url);
        console.log(`Added relay: ${url}`);
      } else {
        // Fallback implementation using pool
        if (ndk.pool && ndk.pool.relays) {
          const relay = ndk.pool.getRelay?.(url);
          if (!relay) {
            console.log(`Could not add relay ${url} - no implementation available`);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to add relay ${url}:`, error);
    }
  }
  
  private safeRemoveRelay(ndk: NDK, url: string): void {
    try {
      // Direct property access to check if method exists
      if (typeof (ndk as any).removeRelay === 'function') {
        (ndk as any).removeRelay(url);
        console.log(`Removed relay: ${url}`);
      } else {
        // Fallback implementation using pool
        if (ndk.pool && ndk.pool.relays) {
          ndk.pool.relays.delete(url);
          console.log(`Removed relay ${url} using pool.relays.delete`);
        }
      }
    } catch (error) {
      console.warn(`Failed to remove relay ${url}:`, error);
    }
  }
  
  /**
   * Import a POWR Pack into the local database
   */
  async importPack(packImport: POWRPackImport, selection: POWRPackSelection): Promise<void> {
    try {
      console.log(`Importing ${selection.selectedExercises.length} exercises...`);
      
      // Map to track imported exercise IDs by various reference formats
      const exerciseIdMap = new Map<string, string>();
      
      // First, import the selected exercises
      for (const exerciseId of selection.selectedExercises) {
        const exerciseEvent = packImport.exercises.find(e => e.id === exerciseId);
        if (!exerciseEvent) continue;
        
        // Get the d-tag value from the event
        const dTag = exerciseEvent.tagValue('d');
        
        // Convert to local model
        const exerciseModel = this.nostrIntegration.convertNostrExerciseToLocal(exerciseEvent);
        
        // Save to database
        const localId = await this.nostrIntegration.saveImportedExercise(exerciseModel, exerciseEvent);
        
        // Map ALL possible ways to reference this exercise:
        
        // 1. By event ID directly (fallback)
        exerciseIdMap.set(exerciseId, localId);
        
        // 2. By standard d-tag reference format (if d-tag exists)
        if (dTag) {
          const dTagRef = `33401:${exerciseEvent.pubkey}:${dTag}`;
          exerciseIdMap.set(dTagRef, localId);
          console.log(`Mapped d-tag reference ${dTagRef} to local exercise ID ${localId}`);
        }
        
        // 3. By event ID as d-tag (for templates that reference this way)
        const eventIdRef = `33401:${exerciseEvent.pubkey}:${exerciseId}`;
        exerciseIdMap.set(eventIdRef, localId);
        console.log(`Mapped event ID reference ${eventIdRef} to local exercise ID ${localId}`);
        
        console.log(`Imported exercise: ${exerciseModel.title} (${localId}) from Nostr event ${exerciseId}`);
      }
      
      console.log(`Importing ${selection.selectedTemplates.length} templates...`);
      
      // Then, import the selected templates
      for (const templateId of selection.selectedTemplates) {
        const templateEvent = packImport.templates.find(t => t.id === templateId);
        if (!templateEvent) continue;
        
        // Convert to local model
        const templateModel = this.nostrIntegration.convertNostrTemplateToLocal(templateEvent);
        
        // Save to database
        const localTemplateId = await this.nostrIntegration.saveImportedTemplate(templateModel, templateEvent);
        
        console.log(`Imported template: ${templateModel.title} (${localTemplateId}) from Nostr event ${templateId}`);
        
        // Get exercise references from this template
        const exerciseRefs = this.nostrIntegration.getTemplateExerciseRefs(templateEvent);
        
        console.log(`Template has ${exerciseRefs.length} exercise references:`);
        exerciseRefs.forEach(ref => console.log(`  - ${ref}`));
        
        // Map exercise references to local exercise IDs
        const templateExerciseIds: string[] = [];
        const matchedRefs: string[] = [];
        
        for (const ref of exerciseRefs) {
          // Extract the base reference (before any parameters)
          const refParts = ref.split('::');
          const baseRefWithRelays = refParts[0]; // May include relay hints separated by commas
          const parts = baseRefWithRelays.split(',');
          const baseRef = parts[0]; // Just the kind:pubkey:d-tag part
          
          console.log(`Looking for matching exercise for reference: ${baseRef}`);
          
          // Check if we have this reference in our map
          if (exerciseIdMap.has(baseRef)) {
            const localExerciseId = exerciseIdMap.get(baseRef) || '';
            templateExerciseIds.push(localExerciseId);
            matchedRefs.push(ref);
            
            console.log(`Mapped reference ${baseRef} to local exercise ID ${localExerciseId}`);
            continue;
          }
          
          // If not found by direct reference, try to match by examining individual components
          console.log(`No direct match for reference: ${baseRef}. Trying to match by components...`);
          
          // Parse the reference for fallback matching
          const refSegments = baseRef.split(':');
          if (refSegments.length >= 3) {
            const refKind = refSegments[0];
            const refPubkey = refSegments[1];
            const refDTag = refSegments[2];
            
            // Try to find the matching exercise by looking at both event ID and d-tag
            for (const [key, value] of exerciseIdMap.entries()) {
              // Check if this is potentially the same exercise with a different reference format
              if (key.includes(refPubkey) && (key.includes(refDTag) || key.endsWith(refDTag))) {
                templateExerciseIds.push(value);
                matchedRefs.push(ref);
                
                // Also add this reference format to map for future lookups
                exerciseIdMap.set(baseRef, value);
                
                console.log(`Found potential match using partial comparison: ${key} -> ${value}`);
                break;
              }
            }
            
            // If no match found yet, check if there's a direct event ID match
            if (templateExerciseIds.length === templateExerciseIds.lastIndexOf(refDTag) + 1) {
              // Didn't add anything in the above loop, try direct event ID lookup
              const matchingEvent = packImport.exercises.find(e => e.id === refDTag);
              
              if (matchingEvent && exerciseIdMap.has(matchingEvent.id)) {
                const localExerciseId = exerciseIdMap.get(matchingEvent.id) || '';
                templateExerciseIds.push(localExerciseId);
                matchedRefs.push(ref);
                
                // Add this reference to our map for future use
                exerciseIdMap.set(baseRef, localExerciseId);
                
                console.log(`Found match by event ID: ${matchingEvent.id} -> ${localExerciseId}`);
              } else {
                console.log(`No matching exercise found for reference components: kind=${refKind}, pubkey=${refPubkey}, d-tag=${refDTag}`);
              }
            }
          } else {
            console.log(`Invalid reference format: ${baseRef}`);
          }
        }
        
        // Save template-exercise relationships with parameters
        if (templateExerciseIds.length > 0) {
          await this.nostrIntegration.saveTemplateExercisesWithParams(
            localTemplateId, 
            templateExerciseIds, 
            matchedRefs
          );
          
          // Log the result 
          console.log(`Checking saved template: ${localTemplateId}`);
          const templateExercises = await this.db.getAllAsync<{ exercise_id: string }>(
            `SELECT exercise_id FROM template_exercises WHERE template_id = ?`,
            [localTemplateId]
          );
          console.log(`Template ${templateModel.title} has ${templateExercises.length} exercises associated`);
        } else {
          console.log(`No exercise relationships to save for template ${localTemplateId}`);
        }
      }
      
      // Finally, save the pack itself
      await this.savePack(packImport.packEvent, selection);
      
      // Get total counts
      const totalNostrTemplates = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM templates WHERE source = 'nostr'`
      );
      
      console.log(`Total nostr templates in database: ${totalNostrTemplates?.count || 0}`);
      
      // Get imported template IDs for verification
      const templates = await this.db.getAllAsync<{ id: string, title: string }>(
        `SELECT id, title FROM templates WHERE source = 'nostr'`
      );
      
      console.log(`Template IDs:`);
      templates.forEach(t => {
        console.log(`  - ${t.title}: ${t.id}`);
      });
    } catch (error) {
      console.error('Error importing pack:', error);
      throw error;
    }
  }
  
  /**
   * Save the pack metadata to the database
   */
  private async savePack(packEvent: NDKEvent, selection: POWRPackSelection): Promise<string> {
    try {
      const now = Date.now();
      
      // Get pack metadata
      const title = packEvent.tagValue('name') || 'Unnamed Pack';
      const description = packEvent.tagValue('about') || packEvent.content || '';
      
      // Save pack to database
      await this.db.runAsync(
        `INSERT INTO powr_packs (id, title, description, author_pubkey, nostr_event_id, import_date, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          selection.packId,
          title,
          description,
          packEvent.pubkey,
          packEvent.id,
          now,
          now
        ]
      );
      
      // Save pack items (templates and exercises)
      let order = 0;
      
      // Save template items
      for (const templateId of selection.selectedTemplates) {
        await this.db.runAsync(
          `INSERT INTO powr_pack_items (pack_id, item_id, item_type, item_order, is_imported, nostr_event_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            selection.packId,
            templateId,
            'template',
            order++,
            1, // Imported
            templateId
          ]
        );
      }
      
      // Save exercise items
      for (const exerciseId of selection.selectedExercises) {
        await this.db.runAsync(
          `INSERT INTO powr_pack_items (pack_id, item_id, item_type, item_order, is_imported, nostr_event_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            selection.packId,
            exerciseId,
            'exercise',
            order++,
            1, // Imported
            exerciseId
          ]
        );
      }
      
      return selection.packId;
    } catch (error) {
      console.error('Error saving pack:', error);
      throw error;
    }
  }
  
  /**
 * Get all imported packs
 */
  async getImportedPacks(): Promise<POWRPackWithContent[]> {
    try {
      // Get all packs
      const packs = await this.db.getAllAsync<{
        id: string;
        title: string;
        description: string;
        author_pubkey: string;
        nostr_event_id: string;
        import_date: number;
        updated_at: number;
      }>(
        `SELECT * FROM powr_packs ORDER BY import_date DESC`
      );
      
      // For each pack, get its templates and exercises
      const result: POWRPackWithContent[] = [];
      
      for (const dbPack of packs) {
        // Transform to match POWRPack type
        const pack: POWRPack = {
          id: dbPack.id,
          title: dbPack.title,
          description: dbPack.description || '',
          authorPubkey: dbPack.author_pubkey,
          nostrEventId: dbPack.nostr_event_id,
          importDate: dbPack.import_date,
          updatedAt: dbPack.updated_at
        };
        
        // Get templates
        const templateData = await this.db.getAllAsync<{
          id: string;
          title: string;
          type: string;
          description: string;
          created_at: number;
        }>(
          `SELECT t.id, t.title, t.type, t.description, t.created_at
          FROM templates t
          JOIN powr_pack_items ppi ON ppi.item_id = t.nostr_event_id
          WHERE ppi.pack_id = ? AND ppi.item_type = 'template'
          ORDER BY ppi.item_order`,
          [pack.id]
        );
        
        // Transform template data to match WorkoutTemplate type
        const templates: WorkoutTemplate[] = templateData.map(t => ({
          id: t.id,
          title: t.title,
          type: (t.type || 'strength') as TemplateType,
          category: 'Custom', // Default value
          description: t.description,
          exercises: [], // Default empty array
          isPublic: true, // Default value
          version: 1, // Default value
          tags: [], // Default empty array
          created_at: t.created_at,
          availability: {
            source: ['nostr']
          }
        }));
        
        // Get exercises
        const exerciseData = await this.db.getAllAsync<{
          id: string;
          title: string;
          type: string;
          category: string;
          description: string;
          created_at: number;
        }>(
          `SELECT e.id, e.title, e.type, e.category, e.description, e.created_at
          FROM exercises e
          JOIN powr_pack_items ppi ON ppi.item_id = e.nostr_event_id
          WHERE ppi.pack_id = ? AND ppi.item_type = 'exercise'
          ORDER BY ppi.item_order`,
          [pack.id]
        );
        
        // Transform exercise data to match BaseExercise type
        const exercises: BaseExercise[] = exerciseData.map(e => ({
          id: e.id,
          title: e.title,
          type: e.type as ExerciseType,
          category: e.category as ExerciseCategory,
          description: e.description,
          tags: [], // Default empty array
          format: {}, // Default empty object
          format_units: {}, // Default empty object
          created_at: e.created_at,
          availability: {
            source: ['nostr']
          }
        }));
        
        result.push({
          pack,
          templates,
          exercises
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting imported packs:', error);
      return [];
    }
  }

    /**
   * Create a shareable naddr for a POWR Pack
   * @param packEvent The Nostr event for the pack
   * @returns A shareable naddr string
   */
  createShareableNaddr(packEvent: NDKEvent): string {
    try {
      // Extract d-tag for the pack (required for naddr)
      const dTag = packEvent.tagValue('d');
      
      if (!dTag) {
        throw new Error('Pack event missing required d-tag');
      }
      
      // Create naddr using NDK's methods
      const naddr = packEvent.encode();
      return naddr;
    } catch (error) {
      console.error('Error creating shareable naddr:', error);
      
      // Fallback: manually construct naddr if NDK's encode fails
      try {
        const { nip19 } = require('nostr-tools');
        
        const dTag = packEvent.tagValue('d') || '';
        
        return nip19.naddrEncode({
          kind: packEvent.kind,
          pubkey: packEvent.pubkey,
          identifier: dTag,
          relays: [] // Optional relay hints
        });
      } catch (fallbackError) {
        console.error('Fallback naddr creation failed:', fallbackError);
        throw new Error('Could not create shareable link for pack');
      }
    }
  }

  /**
   * Delete a POWR Pack
   * @param packId The ID of the pack to delete
   * @param keepItems Whether to keep the imported templates and exercises
   */
  async deletePack(packId: string, keepItems: boolean = true): Promise<void> {
    try {
      if (!keepItems) {
        // Get all templates and exercises from this pack
        const templates = await this.db.getAllAsync<{ id: string }>(
          `SELECT t.id
           FROM templates t
           JOIN powr_pack_items ppi ON ppi.item_id = t.nostr_event_id
           WHERE ppi.pack_id = ? AND ppi.item_type = 'template'`,
          [packId]
        );
        
        const exercises = await this.db.getAllAsync<{ id: string }>(
          `SELECT e.id
           FROM exercises e
           JOIN powr_pack_items ppi ON ppi.item_id = e.nostr_event_id
           WHERE ppi.pack_id = ? AND ppi.item_type = 'exercise'`,
          [packId]
        );
        
        // Delete the templates
        for (const template of templates) {
          await this.db.runAsync(
            `DELETE FROM template_exercises WHERE template_id = ?`,
            [template.id]
          );
          
          await this.db.runAsync(
            `DELETE FROM templates WHERE id = ?`,
            [template.id]
          );
        }
        
        // Delete the exercises
        for (const exercise of exercises) {
          await this.db.runAsync(
            `DELETE FROM exercise_tags WHERE exercise_id = ?`,
            [exercise.id]
          );
          
          await this.db.runAsync(
            `DELETE FROM exercises WHERE id = ?`,
            [exercise.id]
          );
        }
      }
      
      // Delete the pack items
      await this.db.runAsync(
        `DELETE FROM powr_pack_items WHERE pack_id = ?`,
        [packId]
      );
      
      // Finally, delete the pack itself
      await this.db.runAsync(
        `DELETE FROM powr_packs WHERE id = ?`,
        [packId]
      );
    } catch (error) {
      console.error('Error deleting pack:', error);
      throw error;
    }
  }
}