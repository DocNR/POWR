// lib/db/services/POWRPackService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '@/utils/ids';
import { POWRPack, POWRPackItem, POWRPackWithContent, POWRPackImport, POWRPackSelection } from '@/types/powr-pack';
import { BaseExercise } from '@/types/exercise';
import { WorkoutTemplate } from '@/types/templates';
import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk-mobile';
import { nip19 } from 'nostr-tools';
import { findTagValue, getTagValues } from '@/utils/nostr-utils';
import { NostrIntegration } from './NostrIntegration';

class POWRPackService {
  private db: SQLiteDatabase;
  
  constructor(db: SQLiteDatabase) {
    this.db = db;
  }
  
  /**
   * Fetches a POWR Pack from a nostr address (naddr)
   * @param naddr The naddr string pointing to a NIP-51 list
   * @param ndk The NDK instance to use for fetching
   * @returns Promise with the pack data and its contents
   */
  async fetchPackFromNaddr(naddr: string, ndk: NDK): Promise<POWRPackImport> {
    try {
      console.log(`Fetching POWR Pack from naddr: ${naddr}`);
      
      // 1. Decode the naddr
      const decoded = nip19.decode(naddr);
      if (decoded.type !== 'naddr') {
        throw new Error('Invalid naddr format');
      }
      
      const { pubkey, kind, identifier } = decoded.data as { pubkey: string, kind: number, identifier?: string };
      console.log(`Decoded naddr: pubkey=${pubkey}, kind=${kind}, identifier=${identifier}`);
      
      // 2. Check that it's a curation list (kind 30004)
      if (kind !== 30004) {
        throw new Error('Not a valid NIP-51 curation list');
      }
      
      // 3. Create a filter to fetch the pack event
      const packFilter: NDKFilter = {
        kinds: [kind],
        authors: [pubkey],
        '#d': identifier ? [identifier] : undefined
      };
      
      console.log(`Fetching pack with filter: ${JSON.stringify(packFilter)}`);
      
      // 4. Fetch the pack event
      const packEvents = await ndk.fetchEvents(packFilter);
      if (packEvents.size === 0) {
        throw new Error('Pack not found');
      }
      
      const packEvent = Array.from(packEvents)[0];
      console.log(`Fetched pack event: ${packEvent.id}`);
      console.log(`Pack tags: ${JSON.stringify(packEvent.tags)}`);
      
      // 5. Extract template and exercise references
      const templateRefs: string[] = [];
      const exerciseRefs: string[] = [];
      
      for (const tag of packEvent.tags) {
        if (tag[0] === 'a' && tag.length > 1) {
          const addressPointer = tag[1];
          
          // Format is kind:pubkey:d-tag
          if (addressPointer.startsWith('33402:')) {
            // Workout template
            templateRefs.push(addressPointer);
            console.log(`Found template reference: ${addressPointer}`);
          } else if (addressPointer.startsWith('33401:')) {
            // Exercise
            exerciseRefs.push(addressPointer);
            console.log(`Found exercise reference: ${addressPointer}`);
          }
        }
      }
      
      console.log(`Found ${templateRefs.length} template refs and ${exerciseRefs.length} exercise refs`);
      
      // 6. Fetch templates and exercises
      console.log('Fetching referenced templates...');
      const templates = await this.fetchReferencedEvents(ndk, templateRefs);
      
      console.log('Fetching referenced exercises...');
      const exercises = await this.fetchReferencedEvents(ndk, exerciseRefs);
      
      console.log(`Fetched ${templates.length} templates and ${exercises.length} exercises`);
      
      // 7. Return the complete pack data
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
   * Helper function to fetch events from address pointers
   */
  async fetchReferencedEvents(ndk: NDK, addressPointers: string[]): Promise<NDKEvent[]> {
    const events: NDKEvent[] = [];
    
    console.log("Fetching references:", addressPointers);
    
    for (const pointer of addressPointers) {
      try {
        // Parse the pointer (kind:pubkey:d-tag)
        const parts = pointer.split(':');
        if (parts.length < 3) {
          console.error(`Invalid address pointer format: ${pointer}`);
          continue;
        }
        
        // Extract the components
        const kindStr = parts[0];
        const hexPubkey = parts[1];
        const dTagOrEventId = parts[2];
        
        const kind = parseInt(kindStr);
        if (isNaN(kind)) {
          console.error(`Invalid kind in pointer: ${kindStr}`);
          continue;
        }
        
        console.log(`Fetching ${kind} event with d-tag ${dTagOrEventId} from author ${hexPubkey}`);
        
        // Try direct event ID fetching first
        try {
          console.log(`Trying to fetch event directly by ID: ${dTagOrEventId}`);
          const directEvent = await ndk.fetchEvent({ids: [dTagOrEventId]});
          if (directEvent) {
            console.log(`Successfully fetched event by ID: ${dTagOrEventId}`);
            events.push(directEvent);
            continue; // Skip to next loop iteration
          }
        } catch (directFetchError) {
          console.log(`Direct fetch failed, falling back to filters: ${directFetchError}`);
        }
        
        // Create a filter as fallback
        const filter: NDKFilter = {
          kinds: [kind],
          authors: [hexPubkey],
        };
        
        if (dTagOrEventId && dTagOrEventId.length > 0) {
          // For parameterized replaceable events, use d-tag
          filter['#d'] = [dTagOrEventId];
        }
        
        console.log("Using filter:", JSON.stringify(filter));
        
        // Fetch the events with a timeout
        const fetchPromise = ndk.fetchEvents(filter);
        const timeoutPromise = new Promise<Set<NDKEvent>>((_, reject) => 
          setTimeout(() => reject(new Error('Fetch timeout')), 10000)
        );
        
        const fetchedEvents = await Promise.race([fetchPromise, timeoutPromise]);
        console.log(`Found ${fetchedEvents.size} events for ${pointer}`);
        
        if (fetchedEvents.size > 0) {
          events.push(...Array.from(fetchedEvents));
        }
      } catch (error) {
        console.error(`Error fetching event with pointer ${pointer}:`, error);
        // Continue with other events even if one fails
      }
    }
    
    console.log(`Total fetched referenced events: ${events.length}`);
    return events;
  }
  
    /**
     * Analyzes templates and identifies their exercise dependencies
     */
    analyzeDependencies(templates: NDKEvent[], exercises: NDKEvent[]): Record<string, string[]> {
      const dependencies: Record<string, string[]> = {};
      const exerciseMap: Record<string, string> = {};
      
      console.log(`Analyzing dependencies for ${templates.length} templates and ${exercises.length} exercises`);
      
      // Create lookup map for exercises by reference
      exercises.forEach(exercise => {
        const dTag = findTagValue(exercise.tags, 'd');
        if (dTag) {
          const exerciseRef = `33401:${exercise.pubkey}:${dTag}`;
          exerciseMap[exerciseRef] = exercise.id;
          console.log(`Mapped exercise ${exercise.id} to reference ${exerciseRef}`);
        } else {
          console.log(`Exercise ${exercise.id} has no d-tag`);
        }
      });
      
      // Analyze each template for exercise references
      templates.forEach(template => {
        const requiredExercises: string[] = [];
        const templateName = findTagValue(template.tags, 'title') || template.id.substring(0, 8);
        
        console.log(`Analyzing template ${templateName} (${template.id})`);
        
        // Find exercise references in template tags
        template.tags.forEach(tag => {
          if (tag[0] === 'exercise' && tag.length > 1) {
            const exerciseRefFull = tag[1];
            
            // Split the reference to get the base part (without parameters)
            const refParts = exerciseRefFull.split('::');
            const baseRef = refParts[0];
            
            const exerciseId = exerciseMap[baseRef];
            
            if (exerciseId) {
              requiredExercises.push(exerciseId);
              console.log(`Template ${templateName} requires exercise ${exerciseId} via ref ${baseRef}`);
            } else {
              console.log(`Template ${templateName} references unknown exercise ${exerciseRefFull}`);
            }
          }
        });
        
        dependencies[template.id] = requiredExercises;
        console.log(`Template ${templateName} has ${requiredExercises.length} dependencies`);
      });
      
      return dependencies;
    }  
    
  /**
   * Import a POWR Pack and selected items into the database
   */
  async importPack(
    packImport: POWRPackImport,
    selection: POWRPackSelection
  ): Promise<string> {
    try {
      const { packEvent, templates, exercises } = packImport;
      const { selectedTemplates, selectedExercises } = selection;
      
      // Create integration helper
      const nostrIntegration = new NostrIntegration(this.db);
      
      // 1. Extract pack metadata
      const title = findTagValue(packEvent.tags, 'name') || 'Unnamed Pack';
      const description = findTagValue(packEvent.tags, 'about') || packEvent.content;
      
      // 2. Create pack record
      const packId = generateId();
      const now = Date.now();
      
      await this.db.withTransactionAsync(async () => {
        // Insert pack record
        await this.db.runAsync(
          `INSERT INTO powr_packs (id, title, description, author_pubkey, nostr_event_id, import_date, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [packId, title, description, packEvent.pubkey, packEvent.id, now, now]
        );
        
        // 3. Process and import selected exercises
        const exercisesToImport = exercises.filter((e: NDKEvent) => selectedExercises.includes(e.id));
        const importedExerciseIds: string[] = [];
        const exerciseIdMap = new Map<string, string>(); // Map Nostr event ID to local ID
        
        console.log(`Importing ${exercisesToImport.length} exercises...`);
        
        for (const exerciseEvent of exercisesToImport) {
          // Convert to local model
          const exercise = nostrIntegration.convertNostrExerciseToLocal(exerciseEvent);
          
          // Save to database
          await nostrIntegration.saveImportedExercise(exercise);
          
          // Track imported exercise
          importedExerciseIds.push(exercise.id);
          exerciseIdMap.set(exerciseEvent.id, exercise.id);
          
          console.log(`Imported exercise: ${exercise.title} (${exercise.id}) from Nostr event ${exerciseEvent.id}`);
          
          // Create pack item record
          await this.createPackItemRecord(packId, exercise.id, 'exercise', exerciseEvent.id);
        }
        
        // 4. Process and import selected templates
        const templatesToImport = templates.filter((t: NDKEvent) => selectedTemplates.includes(t.id));
        
        console.log(`Importing ${templatesToImport.length} templates...`);
        
        for (const templateEvent of templatesToImport) {
          // Convert to local model
          const templateModel = nostrIntegration.convertNostrTemplateToLocal(templateEvent);
          
          // Save to database
          await nostrIntegration.saveImportedTemplate(templateModel);
          
          console.log(`Imported template: ${templateModel.title} (${templateModel.id}) from Nostr event ${templateEvent.id}`);
          
          // Get exercise references from this template
          const exerciseRefs = nostrIntegration.getTemplateExerciseRefs(templateEvent);
          
          console.log(`Template has ${exerciseRefs.length} exercise references:`);
          exerciseRefs.forEach(ref => console.log(`  - ${ref}`));
          
          // Find the corresponding imported exercise IDs
          const templateExerciseIds: string[] = [];
          const matchedRefs: string[] = [];
          
          for (const ref of exerciseRefs) {
            // Extract the base reference (before any parameters)
            const refParts = ref.split('::');
            const baseRef = refParts[0];
            
            console.log(`Looking for matching exercise for reference: ${baseRef}`);
            
            // Find the event that matches this reference
            const matchingEvent = exercises.find(e => {
              const dTag = findTagValue(e.tags, 'd');
              if (!dTag) return false;
              
              const fullRef = `33401:${e.pubkey}:${dTag}`;
              const match = baseRef === fullRef;
              
              if (match) {
                console.log(`Found matching event: ${e.id} with d-tag: ${dTag}`);
              }
              
              return match;
            });
            
            if (matchingEvent && exerciseIdMap.has(matchingEvent.id)) {
              const localExerciseId = exerciseIdMap.get(matchingEvent.id) || '';
              templateExerciseIds.push(localExerciseId);
              matchedRefs.push(ref); // Keep the full reference including parameters
              
              console.log(`Mapped Nostr event ${matchingEvent.id} to local exercise ID ${localExerciseId}`);
            } else {
              console.log(`No matching exercise found for reference: ${baseRef}`);
            }
          }
          
          // Save template-exercise relationships with parameters
          if (templateExerciseIds.length > 0) {
            await nostrIntegration.saveTemplateExercisesWithParams(templateModel.id, templateExerciseIds, matchedRefs);
          } else {
            console.log(`No exercise relationships to save for template ${templateModel.id}`);
          }
          
          // Create pack item record
          await this.createPackItemRecord(packId, templateModel.id, 'template', templateEvent.id);
          
          // Add diagnostic logging
          console.log(`Checking saved template: ${templateModel.id}`);
          const exerciseCount = await this.db.getFirstAsync<{count: number}>(
            'SELECT COUNT(*) as count FROM template_exercises WHERE template_id = ?',
            [templateModel.id]
          );
          console.log(`Template ${templateModel.title} has ${exerciseCount?.count || 0} exercises associated`);
        }
        
        // Final diagnostic check
        const templateCount = await this.db.getFirstAsync<{count: number}>(
          'SELECT COUNT(*) as count FROM templates WHERE source = "nostr"'
        );
        console.log(`Total nostr templates in database: ${templateCount?.count || 0}`);
        
        const templateIds = await this.db.getAllAsync<{id: string, title: string}>(
          'SELECT id, title FROM templates WHERE source = "nostr"'
        );
        console.log(`Template IDs:`);
        templateIds.forEach(t => console.log(`  - ${t.title}: ${t.id}`));
      });

      return packId;
    } catch (error) {
      console.error('Error importing POWR pack:', error);
      throw error;
    }
  }
  
  /**
   * Create a record of a pack item
   */
  private async createPackItemRecord(
    packId: string,
    itemId: string,
    itemType: 'exercise' | 'template',
    nostrEventId?: string,
    itemOrder?: number
  ): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO powr_pack_items (pack_id, item_id, item_type, item_order, is_imported, nostr_event_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [packId, itemId, itemType, itemOrder || 0, 1, nostrEventId || null]
    );
  }
  
  /**
   * Get all imported packs
   */
  async getImportedPacks(): Promise<POWRPackWithContent[]> {
    try {
      // 1. Get all packs
      const packs = await this.db.getAllAsync<POWRPack>(
        `SELECT id, title, description, author_pubkey as authorPubkey, 
                nostr_event_id as nostrEventId, import_date as importDate, updated_at as updatedAt
         FROM powr_packs
         ORDER BY import_date DESC`
      );
      
      // 2. Get content for each pack
      const result: POWRPackWithContent[] = [];
      
      for (const pack of packs) {
        // Get exercises
        const exercises = await this.db.getAllAsync<BaseExercise>(
          `SELECT e.*
           FROM exercises e
           JOIN powr_pack_items ppi ON e.id = ppi.item_id
           WHERE ppi.pack_id = ? AND ppi.item_type = 'exercise' AND ppi.is_imported = 1`,
          [pack.id]
        );
        
        // Get templates
        const templates = await this.db.getAllAsync<WorkoutTemplate>(
          `SELECT t.*
           FROM templates t
           JOIN powr_pack_items ppi ON t.id = ppi.item_id
           WHERE ppi.pack_id = ? AND ppi.item_type = 'template' AND ppi.is_imported = 1`,
          [pack.id]
        );
        
        result.push({
          pack,
          exercises,
          templates
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting imported packs:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific pack by ID
   */
  async getPackById(packId: string): Promise<POWRPackWithContent | null> {
    try {
      // 1. Get pack info
      const pack = await this.db.getFirstAsync<POWRPack>(
        `SELECT id, title, description, author_pubkey as authorPubkey, 
                nostr_event_id as nostrEventId, import_date as importDate, updated_at as updatedAt
         FROM powr_packs
         WHERE id = ?`,
        [packId]
      );
      
      if (!pack) {
        return null;
      }
      
      // 2. Get exercises
      const exercises = await this.db.getAllAsync<BaseExercise>(
        `SELECT e.*
         FROM exercises e
         JOIN powr_pack_items ppi ON e.id = ppi.item_id
         WHERE ppi.pack_id = ? AND ppi.item_type = 'exercise' AND ppi.is_imported = 1`,
        [packId]
      );
      
      // 3. Get templates
      const templates = await this.db.getAllAsync<WorkoutTemplate>(
        `SELECT t.*
         FROM templates t
         JOIN powr_pack_items ppi ON t.id = ppi.item_id
         WHERE ppi.pack_id = ? AND ppi.item_type = 'template' AND ppi.is_imported = 1`,
        [packId]
      );
      
      return {
        pack,
        exercises,
        templates
      };
    } catch (error) {
      console.error('Error getting pack by ID:', error);
      throw error;
    }
  }
  
  /**
   * Delete a pack and optionally its contents
   */
  async deletePack(packId: string, keepItems: boolean = false): Promise<void> {
    try {
      await this.db.withTransactionAsync(async () => {
        if (!keepItems) {
          // Get the items first so we can delete them from their respective tables
          const items = await this.db.getAllAsync<POWRPackItem>(
            `SELECT * FROM powr_pack_items WHERE pack_id = ? AND is_imported = 1`,
            [packId]
          );
          
          // Delete each exercise and template
          for (const item of items as POWRPackItem[]) {
            if (item.itemType === 'exercise') {
              // Delete exercise
              await this.db.runAsync(`DELETE FROM exercises WHERE id = ?`, [item.itemId]);
            } else if (item.itemType === 'template') {
              // Delete template and its relationships
              await this.db.runAsync(`DELETE FROM template_exercises WHERE template_id = ?`, [item.itemId]);
              await this.db.runAsync(`DELETE FROM templates WHERE id = ?`, [item.itemId]);
            }
          }
        }
        
        // Delete the pack items
        await this.db.runAsync(
          `DELETE FROM powr_pack_items WHERE pack_id = ?`,
          [packId]
        );
        
        // Delete the pack
        await this.db.runAsync(
          `DELETE FROM powr_packs WHERE id = ?`,
          [packId]
        );
      });
    } catch (error) {
      console.error('Error deleting pack:', error);
      throw error;
    }
  }
  
  /**
   * Create an naddr for sharing a pack
   */
  createShareableNaddr(packEvent: NDKEvent): string {
    try {
      // Extract the d-tag (identifier)
      const dTags = packEvent.getMatchingTags('d');
      const identifier = dTags[0]?.[1] || '';
      
      // Ensure kind is a definite number (use 30004 as default if undefined)
      const kind = packEvent.kind !== undefined ? packEvent.kind : 30004;
      
      // Create the naddr
      const naddr = nip19.naddrEncode({
        pubkey: packEvent.pubkey,
        kind: kind, // Now this is always a number
        identifier
      });
      
      return naddr;
    } catch (error) {
      console.error('Error creating shareable naddr:', error);
      throw error;
    }
  }
}

export default POWRPackService;