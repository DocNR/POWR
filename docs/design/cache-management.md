# POWR App: Cache Management Implementation Guide

This document outlines the implementation of cache management features in the POWR fitness app, including data synchronization options and cache clearing functions.

## 1. Overview

The cache management system will allow users to:
1. Sync their library data from Nostr on demand
2. Clear different levels of cached data
3. View storage usage information
4. Configure automatic sync behavior

## 2. Data Services Implementation

### 2.1 CacheService Class

Create a new service to handle cache management operations:

```typescript
// lib/services/CacheService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { schema } from '@/lib/db/schema';

export enum CacheClearLevel {
  RELAY_CACHE = 'relay_cache',      // Just temporary relay data
  NETWORK_CONTENT = 'network',      // Other users' content
  EVERYTHING = 'everything'         // Reset the entire database (except user credentials)
}

export class CacheService {
  private db: SQLiteDatabase;
  
  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Get storage usage statistics by category
   */
  async getStorageStats(): Promise<{
    userContent: number;  // bytes used by user's content
    networkContent: number; // bytes used by other users' content
    temporaryCache: number; // bytes used by temporary cache
    total: number;  // total bytes used
  }> {
    // Implementation to calculate database size by category
    // This is a placeholder - actual implementation would depend on platform-specific APIs
    
    // For SQLite, you'd typically query the page_count and page_size
    // from sqlite_master to estimate database size
    try {
      const dbSize = await this.db.getFirstAsync<{ size: number }>(
        "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
      );
      
      // For a more detailed breakdown, you'd need to query each table size
      // This is simplified
      const userContentSize = dbSize?.size ? Math.floor(dbSize.size * 0.4) : 0;
      const networkContentSize = dbSize?.size ? Math.floor(dbSize.size * 0.4) : 0;
      const tempCacheSize = dbSize?.size ? Math.floor(dbSize.size * 0.2) : 0;
      
      return {
        userContent: userContentSize,
        networkContent: networkContentSize,
        temporaryCache: tempCacheSize,
        total: dbSize?.size || 0
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        userContent: 0,
        networkContent: 0,
        temporaryCache: 0,
        total: 0
      };
    }
  }
  
  /**
   * Clears cache based on the specified level
   */
  async clearCache(level: CacheClearLevel, currentUserPubkey?: string): Promise<void> {
    switch(level) {
      case CacheClearLevel.RELAY_CACHE:
        // Clear temporary relay cache but keep all local content
        await this.clearRelayCache();
        break;
        
      case CacheClearLevel.NETWORK_CONTENT:
        // Clear other users' content but keep user's own content
        if (!currentUserPubkey) throw new Error('User pubkey required for this operation');
        await this.clearNetworkContent(currentUserPubkey);
        break;
        
      case CacheClearLevel.EVERYTHING:
        // Reset everything except user credentials
        await this.resetDatabase();
        break;
    }
  }
  
  /**
   * Clears only temporary cache entries
   */
  private async clearRelayCache(): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      // Clear cache_metadata table
      await this.db.runAsync('DELETE FROM cache_metadata');
    });
  }
  
  /**
   * Clears network content from other users
   */
  private async clearNetworkContent(userPubkey: string): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      // Delete events from other users
      await this.db.runAsync(
        'DELETE FROM nostr_events WHERE pubkey != ?',
        [userPubkey]
      );
      
      // Delete references to those events
      await this.db.runAsync(
        `DELETE FROM event_tags 
         WHERE event_id NOT IN (
           SELECT id FROM nostr_events
         )`
      );
      
      // Delete exercises that reference deleted events
      await this.db.runAsync(
        `DELETE FROM exercises 
         WHERE source = 'nostr' 
         AND nostr_event_id NOT IN (
           SELECT id FROM nostr_events
         )`
      );
      
      // Delete tags for those exercises
      await this.db.runAsync(
        `DELETE FROM exercise_tags 
         WHERE exercise_id NOT IN (
           SELECT id FROM exercises
         )`
      );
    });
  }
  
  /**
   * Resets the entire database but preserves user credentials
   */
  private async resetDatabase(): Promise<void> {
    // Save user credentials before reset
    const userProfiles = await this.db.getAllAsync(
      'SELECT * FROM user_profiles'
    );
    
    const userRelays = await this.db.getAllAsync(
      'SELECT * FROM user_relays'
    );
    
    // Reset schema (keeping user credentials)
    await this.db.withTransactionAsync(async () => {
      // Drop all content tables
      await this.db.execAsync('DROP TABLE IF EXISTS exercises');
      await this.db.execAsync('DROP TABLE IF EXISTS exercise_tags');
      await this.db.execAsync('DROP TABLE IF EXISTS nostr_events');
      await this.db.execAsync('DROP TABLE IF EXISTS event_tags');
      await this.db.execAsync('DROP TABLE IF EXISTS cache_metadata');
      
      // Recreate schema
      await schema.createTables(this.db);
    });
    
    // Restore user profiles and relays
    if (userProfiles.length > 0) {
      await this.db.withTransactionAsync(async () => {
        for (const profile of userProfiles) {
          await this.db.runAsync(
            `INSERT INTO user_profiles (
              pubkey, name, display_name, about, website, 
              picture, nip05, lud16, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              profile.pubkey,
              profile.name,
              profile.display_name,
              profile.about,
              profile.website,
              profile.picture,
              profile.nip05,
              profile.lud16,
              profile.last_updated
            ]
          );
        }
        
        for (const relay of userRelays) {
          await this.db.runAsync(
            `INSERT INTO user_relays (
              pubkey, relay_url, read, write, created_at
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              relay.pubkey,
              relay.relay_url,
              relay.read,
              relay.write,
              relay.created_at
            ]
          );
        }
      });
    }
  }
}
```

### 2.2 NostrSyncService Class

Create a service for syncing content from Nostr:

```typescript
// lib/services/NostrSyncService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { EventCache } from '@/lib/db/services/EventCache';
import { ExerciseService } from '@/lib/db/services/ExerciseService';
import { NostrEvent } from '@/types/nostr';
import { convertNostrToExercise } from '@/utils/converters';

export interface SyncProgress {
  total: number;
  processed: number;
  status: 'idle' | 'syncing' | 'complete' | 'error';
  message?: string;
}

export class NostrSyncService {
  private db: SQLiteDatabase;
  private eventCache: EventCache;
  private exerciseService: ExerciseService;
  private syncStatus: SyncProgress = {
    total: 0,
    processed: 0,
    status: 'idle'
  };
  
  constructor(db: SQLiteDatabase) {
    this.db = db;
    this.eventCache = new EventCache(db);
    this.exerciseService = new ExerciseService(db);
  }
  
  /**
   * Get current sync status
   */
  getSyncStatus(): SyncProgress {
    return { ...this.syncStatus };
  }
  
  /**
   * Synchronize user's library from Nostr
   */
  async syncUserLibrary(
    pubkey: string, 
    ndk: any, // Replace with NDK type
    progressCallback?: (progress: SyncProgress) => void
  ): Promise<void> {
    try {
      this.syncStatus = {
        total: 0,
        processed: 0,
        status: 'syncing',
        message: 'Starting sync...'
      };
      
      if (progressCallback) progressCallback(this.syncStatus);
      
      // 1. Fetch exercise events (kind 33401)
      this.syncStatus.message = 'Fetching exercises...';
      if (progressCallback) progressCallback(this.syncStatus);
      
      const exercises = await this.fetchUserExercises(pubkey, ndk);
      
      this.syncStatus.total = exercises.length;
      this.syncStatus.message = `Processing ${exercises.length} exercises...`;
      if (progressCallback) progressCallback(this.syncStatus);
      
      // 2. Process each exercise
      for (const exercise of exercises) {
        await this.processExercise(exercise);
        this.syncStatus.processed++;
        
        if (progressCallback) progressCallback(this.syncStatus);
      }
      
      // 3. Update final status
      this.syncStatus.status = 'complete';
      this.syncStatus.message = 'Sync completed successfully';
      if (progressCallback) progressCallback(this.syncStatus);
      
    } catch (error) {
      this.syncStatus.status = 'error';
      this.syncStatus.message = `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (progressCallback) progressCallback(this.syncStatus);
      throw error;
    }
  }
  
  /**
   * Fetch user's exercise events from Nostr
   */
  private async fetchUserExercises(pubkey: string, ndk: any): Promise<NostrEvent[]> {
    // Use NDK subscription to fetch exercise events (kind 33401)
    return new Promise((resolve) => {
      const exercises: NostrEvent[] = [];
      const filter = { kinds: [33401], authors: [pubkey] };
      const subscription = ndk.subscribe(filter);
      
      subscription.on('event', (event: NostrEvent) => {
        exercises.push(event);
      });
      
      subscription.on('eose', () => {
        resolve(exercises);
      });
    });
  }
  
  /**
   * Process and store an exercise event
   */
  private async processExercise(event: NostrEvent): Promise<void> {
    // 1. Check if we already have this event
    const existingEvent = await this.eventCache.getEvent(event.id);
    if (existingEvent) return;
    
    // 2. Store the event
    await this.eventCache.setEvent(event);
    
    // 3. Convert to Exercise and store in exercises table
    const exercise = convertNostrToExercise(event);
    await this.exerciseService.createExercise(exercise);
  }
}
```

## 3. UI Components

### 3.1 Modify SettingsDrawer.tsx

Update the existing SettingsDrawer component to include the new cache-related menu items:

```typescript
// Add these imports
import { useSQLiteContext } from 'expo-sqlite';
import { CacheService, CacheClearLevel } from '@/lib/services/CacheService';
import { NostrSyncService } from '@/lib/services/NostrSyncService';
import { formatBytes } from '@/utils/format';

// Update the menuItems array to include Data Management options:

const menuItems: MenuItem[] = [
  // ... existing menu items

  // Replace the "Data Sync" item with this:
  {
    id: 'data-management',
    icon: Database,
    label: 'Data Management',
    onPress: () => {
      closeDrawer();
      router.push('/settings/data-management');
    },
  },
  
  // ... other menu items
];
```

### 3.2 Create DataManagementScreen Component

Create a new screen for data management:

```typescript
// app/settings/data-management.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSQLiteContext } from 'expo-sqlite';
import { useNDK, useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { CacheService, CacheClearLevel } from '@/lib/services/CacheService';
import { NostrSyncService, SyncProgress } from '@/lib/services/NostrSyncService';
import { formatBytes } from '@/utils/format';
import { 
  RefreshCw, Trash2, Database, AlertTriangle, CheckCircle, AlertCircle
} from 'lucide-react-native';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DataManagementScreen() {
  const db = useSQLiteContext();
  const { ndk } = useNDK();
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  
  const [storageStats, setStorageStats] = useState({
    userContent: 0,
    networkContent: 0,
    temporaryCache: 0,
    total: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    total: 0,
    processed: 0,
    status: 'idle'
  });
  
  const [showClearCacheAlert, setShowClearCacheAlert] = useState(false);
  const [clearCacheLevel, setClearCacheLevel] = useState<CacheClearLevel>(CacheClearLevel.RELAY_CACHE);
  const [clearCacheLoading, setClearCacheLoading] = useState(false);
  
  // Auto-sync settings
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Load storage stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const cacheService = new CacheService(db);
        const stats = await cacheService.getStorageStats();
        setStorageStats(stats);
      } catch (error) {
        console.error('Error loading storage stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, [db]);

  // Handle manual sync
  const handleSync = async () => {
    if (!isAuthenticated || !currentUser?.pubkey || !ndk) return;
    
    try {
      setSyncing(true);
      
      const syncService = new NostrSyncService(db);
      await syncService.syncUserLibrary(
        currentUser.pubkey,
        ndk,
        (progress) => {
          setSyncProgress(progress);
        }
      );
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  // Trigger clear cache alert
  const handleClearCacheClick = (level: CacheClearLevel) => {
    setClearCacheLevel(level);
    setShowClearCacheAlert(true);
  };
  
  // Handle clear cache action
  const handleClearCache = async () => {
    if (!isAuthenticated && clearCacheLevel !== CacheClearLevel.RELAY_CACHE) {
      return; // Only allow clearing relay cache if not authenticated
    }
    
    try {
      setClearCacheLoading(true);
      
      const cacheService = new CacheService(db);
      await cacheService.clearCache(
        clearCacheLevel, 
        isAuthenticated ? currentUser?.pubkey : undefined
      );
      
      // Refresh stats
      const stats = await cacheService.getStorageStats();
      setStorageStats(stats);
      
      setShowClearCacheAlert(false);
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setClearCacheLoading(false);
    }
  };

  // Calculate sync progress percentage
  const syncPercentage = syncProgress.total > 0 
    ? Math.round((syncProgress.processed / syncProgress.total) * 100) 
    : 0;

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-xl font-semibold mb-4">Data Management</Text>
      
      {/* Storage Usage Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <View className="flex-row items-center mb-4">
            <Database size={20} className="text-primary mr-2" />
            <Text className="text-lg font-semibold">Storage Usage</Text>
          </View>
          
          {loading ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" className="mb-2" />
              <Text className="text-muted-foreground">Loading storage statistics...</Text>
            </View>
          ) : (
            <>
              <View className="mb-4">
                <Text className="text-sm mb-1">User Content</Text>
                <View className="flex-row justify-between mb-2">
                  <Progress value={storageStats.userContent / storageStats.total * 100} className="flex-1 mr-2" />
                  <Text className="text-sm text-muted-foreground w-20 text-right">
                    {formatBytes(storageStats.userContent)}
                  </Text>
                </View>
                
                <Text className="text-sm mb-1">Network Content</Text>
                <View className="flex-row justify-between mb-2">
                  <Progress value={storageStats.networkContent / storageStats.total * 100} className="flex-1 mr-2" />
                  <Text className="text-sm text-muted-foreground w-20 text-right">
                    {formatBytes(storageStats.networkContent)}
                  </Text>
                </View>
                
                <Text className="text-sm mb-1">Temporary Cache</Text>
                <View className="flex-row justify-between mb-2">
                  <Progress value={storageStats.temporaryCache / storageStats.total * 100} className="flex-1 mr-2" />
                  <Text className="text-sm text-muted-foreground w-20 text-right">
                    {formatBytes(storageStats.temporaryCache)}
                  </Text>
                </View>
              </View>
              
              <Separator className="mb-4" />
              
              <View className="flex-row justify-between items-center">
                <Text className="font-medium">Total Storage</Text>
                <Text className="font-medium">{formatBytes(storageStats.total)}</Text>
              </View>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Sync Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <View className="flex-row items-center mb-4">
            <RefreshCw size={20} className="text-primary mr-2" />
            <Text className="text-lg font-semibold">Sync</Text>
          </View>
          
          {!isAuthenticated ? (
            <Text className="text-muted-foreground mb-4">
              Login with Nostr to sync your library across devices.
            </Text>
          ) : (
            <>
              {/* Auto-sync settings */}
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="font-medium">Auto-sync on startup</Text>
                  <Text className="text-sm text-muted-foreground">
                    Automatically sync data when you open the app
                  </Text>
                </View>
                <Switch
                  checked={autoSyncEnabled}
                  onCheckedChange={setAutoSyncEnabled}
                />
              </View>
              
              <Separator className="mb-4" />
              
              {/* Sync status and controls */}
              {syncing ? (
                <View className="mb-4">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm">
                      {syncProgress.message || 'Syncing...'}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {syncProgress.processed}/{syncProgress.total}
                    </Text>
                  </View>
                  <Progress value={syncPercentage} className="mb-2" />
                  <Text className="text-xs text-muted-foreground text-center">
                    {syncPercentage}% complete
                  </Text>
                </View>
              ) : (
                <>
                  {syncProgress.status === 'complete' && (
                    <View className="flex-row items-center mb-4">
                      <CheckCircle size={16} className="text-primary mr-2" />
                      <Text className="text-sm">Last sync completed successfully</Text>
                    </View>
                  )}
                  
                  {syncProgress.status === 'error' && (
                    <View className="flex-row items-center mb-4">
                      <AlertCircle size={16} className="text-destructive mr-2" />
                      <Text className="text-sm">{syncProgress.message}</Text>
                    </View>
                  )}
                </>
              )}
              
              <Button 
                className="w-full" 
                onPress={handleSync} 
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" className="mr-2" />
                    <Text className="text-primary-foreground">Syncing...</Text>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} className="mr-2 text-primary-foreground" />
                    <Text className="text-primary-foreground">Sync Now</Text>
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Cache Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <View className="flex-row items-center mb-4">
            <Trash2 size={20} className="text-primary mr-2" />
            <Text className="text-lg font-semibold">Clear Cache</Text>
          </View>
          
          <View className="space-y-4">
            <View>
              <Button 
                variant="outline" 
                className="w-full mb-2" 
                onPress={() => handleClearCacheClick(CacheClearLevel.RELAY_CACHE)}
              >
                <Text>Clear Temporary Cache</Text>
              </Button>
              <Text className="text-xs text-muted-foreground">
                Clears temporary data without affecting your workouts, exercises, or templates.
              </Text>
            </View>
            
            <View>
              <Button 
                variant="outline" 
                className="w-full mb-2" 
                onPress={() => handleClearCacheClick(CacheClearLevel.NETWORK_CONTENT)}
                disabled={!isAuthenticated}
              >
                <Text>Clear Network Content</Text>
              </Button>
              <Text className="text-xs text-muted-foreground">
                Clears exercises and templates from other users while keeping your own content.
              </Text>
            </View>
            
            <View>
              <Button 
                variant="destructive" 
                className="w-full mb-2" 
                onPress={() => handleClearCacheClick(CacheClearLevel.EVERYTHING)}
                disabled={!isAuthenticated}
              >
                <Text className="text-destructive-foreground">Reset All Data</Text>
              </Button>
              <Text className="text-xs text-muted-foreground">
                Warning: This will delete ALL your local data. Your Nostr identity will be preserved,
                but you'll need to re-sync your library from the network.
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
      
      {/* Clear Cache Alert Dialog */}
      <AlertDialog open={showClearCacheAlert} onOpenChange={setShowClearCacheAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clearCacheLevel === CacheClearLevel.RELAY_CACHE && "Clear Temporary Cache?"}
              {clearCacheLevel === CacheClearLevel.NETWORK_CONTENT && "Clear Network Content?"}
              {clearCacheLevel === CacheClearLevel.EVERYTHING && "Reset All Data?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clearCacheLevel === CacheClearLevel.RELAY_CACHE && (
                <Text>
                  This will clear temporary data from the app. Your workouts, exercises, and templates will not be affected.
                </Text>
              )}
              {clearCacheLevel === CacheClearLevel.NETWORK_CONTENT && (
                <Text>
                  This will clear exercises and templates from other users. Your own content will be preserved.
                </Text>
              )}
              {clearCacheLevel === CacheClearLevel.EVERYTHING && (
                <View className="space-y-2">
                  <View className="flex-row items-center">
                    <AlertTriangle size={16} className="text-destructive mr-2" />
                    <Text className="text-destructive font-semibold">Warning: This is destructive!</Text>
                  </View>
                  <Text>
                    This will delete ALL your local data. Your Nostr identity will be preserved,
                    but you'll need to re-sync your library from the network.
                  </Text>
                </View>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setShowClearCacheAlert(false)}>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction 
              onPress={handleClearCache}
              className={clearCacheLevel === CacheClearLevel.EVERYTHING ? "bg-destructive" : ""}
            >
              <Text className={clearCacheLevel === CacheClearLevel.EVERYTHING ? "text-destructive-foreground" : ""}>
                {clearCacheLoading ? "Clearing..." : "Clear"}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollView>
  );
}
```

### 3.3 Add Formatting Utility

Create a utility function to format byte sizes:

```typescript
// utils/format.ts

/**
 * Format bytes to a human-readable string (KB, MB, etc.)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
```

### 3.4 Add Progress Component

If you don't have a Progress component yet, create one:

```typescript
// components/ui/progress.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({
  value = 0,
  max = 100,
  className,
  indicatorClassName,
  ...props
}: ProgressProps) {
  const theme = useTheme();
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);
  
  return (
    <View 
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)} 
      {...props}
    >
      <View
        className={cn("h-full bg-primary", indicatorClassName)}
        style={[
          styles.indicator, 
          { width: `${percentage}%` }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    transition: 'width 0.2s ease-in-out',
  },
});
```

## 4. Implementation Steps

### 4.1 Database Modifications

1. Ensure your schema has the necessary tables:
   - `nostr_events` - for storing raw Nostr events
   - `event_tags` - for storing event tags
   - `cache_metadata` - for tracking cache item usage

2. Add cache-related columns to existing tables:
   - Add `source` to exercises table (if not already present)
   - Add `last_accessed` timestamp where relevant

### 4.2 Implement Services

1. Create `CacheService.ts` with methods for:
   - Getting storage statistics
   - Clearing different levels of cache
   - Resetting database

2. Create `NostrSyncService.ts` with methods for:
   - Syncing user's library from Nostr
   - Tracking sync progress
   - Processing different types of Nostr events

### 4.3 Add UI Components

1. Update `SettingsDrawer.tsx` to include a "Data Management" option
2. Create `/settings/data-management.tsx` screen with:
   - Storage usage visualization
   - Sync controls
   - Cache clearing options

3. Create supporting components:
   - Progress bar
   - Alert dialogs for confirming destructive actions

### 4.4 Integration with NDK

1. Update the login flow to trigger library sync after successful login
2. Implement background sync based on user preferences
3. Add event handling to track when new events come in from subscriptions

## 5. Testing Considerations

1. Test with both small and large datasets:
   - Create test accounts with varying amounts of data
   - Test sync and clear operations with hundreds or thousands of events

2. Test edge cases:
   - Network disconnections during sync
   - Interruptions during cache clearing
   - Database corruption recovery

3. Performance testing:
   - Measure sync time for different dataset sizes
   - Monitor memory usage during sync operations
   - Test on low-end devices to ensure performance is acceptable

4. Cross-platform testing:
   - Ensure SQLite operations work consistently on iOS, Android, and web
   - Test UI rendering on different screen sizes
   - Verify that progress indicators update correctly on all platforms

5. Data integrity testing:
   - Verify that user content is preserved after clearing network cache
   - Confirm that identity information persists after database reset
   - Test that synced data matches what's available on relays

## 6. User Experience Considerations

1. Feedback and transparency:
   - Always show clear feedback during long-running operations
   - Display last sync time and status
   - Make it obvious what will happen with each cache-clearing option

2. Error handling:
   - Provide clear error messages when sync fails
   - Offer retry options for failed operations
   - Include options to report sync issues

3. Progressive disclosure:
   - Hide advanced/dangerous options unless explicitly expanded
   - Use appropriate warning colors for destructive actions
   - Implement confirmation dialogs with clear explanations

4. Accessibility:
   - Ensure progress indicators have appropriate ARIA labels
   - Maintain adequate contrast for all text and UI elements
   - Support screen readers for all status updates

## 7. Future Enhancements

1. Selective sync:
   - Allow users to choose which content types to sync (exercises, templates, etc.)
   - Implement priority-based sync for most important content first

2. Smart caching:
   - Automatically prune rarely-used network content
   - Keep frequently accessed content even when clearing other cache

3. Backup and restore:
   - Add export/import functionality for local backup
   - Implement scheduled automatic backups

4. Advanced sync controls:
   - Allow selection of specific relays for sync operations
   - Implement bandwidth usage limits for sync

5. Conflict resolution:
   - Develop a UI for handling conflicts when the same event has different versions
   - Add options for manual content merging

## 8. Conclusion

This implementation provides a robust solution for managing cache and synchronization in the POWR fitness app. By giving users clear control over their data and implementing efficient sync mechanisms, the app can provide a better experience across devices while respecting user preferences and device constraints.

The approach keeps user data secure while allowing for flexible network content management, ensuring that the app remains responsive and efficient even as the user's library grows.