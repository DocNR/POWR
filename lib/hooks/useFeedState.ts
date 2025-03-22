// lib/hooks/useFeedState.ts
import { useState, useRef, useCallback } from 'react';
import { AnyFeedEntry } from '@/types/feed';

export function useFeedState(initialSortFn = (a: AnyFeedEntry, b: AnyFeedEntry) => b.timestamp - a.timestamp) {
  // Main entries state
  const [entries, setEntries] = useState<AnyFeedEntry[]>([]);
  const [newEntries, setNewEntries] = useState<AnyFeedEntry[]>([]);
  
  // Reference to actual entries for stable access without re-renders
  const entriesRef = useRef<Record<string, AnyFeedEntry>>({});
  // Track seen events to avoid duplicates
  const seenEventsRef = useRef<Set<string>>(new Set());
  
  // Add or update an entry
  const upsertEntry = useCallback((entry: AnyFeedEntry) => {
    if (!entry.id || !entry.eventId) return;
    
    // Skip if we've already seen this event
    if (seenEventsRef.current.has(entry.eventId)) return;
    seenEventsRef.current.add(entry.eventId);
    
    // Store in reference map for efficient lookup
    entriesRef.current[entry.id] = entry;
    
    // Convert to array for display
    const entriesArray = Object.values(entriesRef.current).sort(initialSortFn);
    setEntries(entriesArray);
  }, [initialSortFn]);
  
  // Add to new entries
  const addNewEntry = useCallback((entry: AnyFeedEntry) => {
    setNewEntries(prev => [...prev, entry]);
  }, []);
  
  // Clear new entries
  const clearNewEntries = useCallback(() => {
    setNewEntries([]);
  }, []);
  
  // Reset feed state
  const resetFeed = useCallback(() => {
    entriesRef.current = {};
    seenEventsRef.current.clear();
    setEntries([]);
    setNewEntries([]);
    return Promise.resolve();
  }, []);
  
  return {
    entries,
    newEntries,
    upsertEntry,
    addNewEntry,
    clearNewEntries,
    resetFeed,
    // Expose refs for advanced usage
    entriesRef,
    seenEventsRef
  };
}