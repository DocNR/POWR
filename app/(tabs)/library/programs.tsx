// app/(tabs)/library/programs.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, TextInput, ActivityIndicator, Platform, Alert, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';
import { 
  AlertCircle, CheckCircle2, Database, RefreshCcw, Trash2, 
  Code, Search, ListFilter, Wifi, Zap, FileJson
} from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNDK, useNDKAuth, useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { schema } from '@/lib/db/schema';
import { FilterSheet, type FilterOptions, type SourceType } from '@/components/library/FilterSheet';
import { Separator } from '@/components/ui/separator';
import { NostrEventKind } from '@/types/nostr';
import { useNDKStore } from '@/lib/stores/ndk';
import * as SecureStore from 'expo-secure-store';

// Define relay status
enum RelayStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

// Interface for event display
interface DisplayEvent {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  content: string;
  tags: string[][];
  sig?: string;
}

// Default available filters for programs
const availableFilters = {
  equipment: ['Barbell', 'Dumbbell', 'Bodyweight', 'Machine', 'Cables', 'Other'],
  tags: ['Strength', 'Cardio', 'Mobility', 'Recovery'],
  source: ['local', 'powr', 'nostr'] as SourceType[]
};

// Initial filter state
const initialFilters: FilterOptions = {
  equipment: [],
  tags: [],
  source: []
};

export default function ProgramsScreen() {
  const db = useSQLiteContext();
  
  // Database state
  const [dbStatus, setDbStatus] = useState<{
    initialized: boolean;
    tables: string[];
    error?: string;
  }>({
    initialized: false,
    tables: [],
  });
  const [schemas, setSchemas] = useState<{name: string, sql: string}[]>([]);
  const [testResults, setTestResults] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>(initialFilters);
  const [activeFilters, setActiveFilters] = useState(0);
  
  // Nostr state
  const [relayStatus, setRelayStatus] = useState<RelayStatus>(RelayStatus.DISCONNECTED);
  const [statusMessage, setStatusMessage] = useState('');
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventKind, setEventKind] = useState(NostrEventKind.TEXT);
  const [eventContent, setEventContent] = useState('');
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  
  // Use the NDK hooks
  const { ndk, isLoading: ndkLoading } = useNDK();
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  const { login, logout, generateKeys } = useNDKAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('nostr'); // Default to nostr tab for testing
  
  useEffect(() => {
    // Check database status
    checkDatabase();
    inspectDatabase();
    
    // Update relay status when NDK changes
    if (ndk) {
      setRelayStatus(RelayStatus.CONNECTED);
      setStatusMessage(isAuthenticated 
        ? `Connected as ${currentUser?.npub?.slice(0, 8)}...` 
        : 'Connected to relays via NDK');
    } else if (ndkLoading) {
      setRelayStatus(RelayStatus.CONNECTING);
      setStatusMessage('Connecting to relays...');
    } else {
      setRelayStatus(RelayStatus.DISCONNECTED);
      setStatusMessage('Not connected');
    }
  }, [ndk, ndkLoading, isAuthenticated, currentUser]);

  // DATABASE FUNCTIONS
  
  const inspectDatabase = async () => {
    try {
      const result = await db.getAllAsync<{name: string, sql: string}>(
        "SELECT name, sql FROM sqlite_master WHERE type='table'"
      );
      setSchemas(result);
    } catch (error) {
      console.error('Error inspecting database:', error);
    }
  };

  const checkDatabase = async () => {
    try {
      // Check schema_version table
      const version = await db.getFirstAsync<{version: number}>(
        'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
      );
      
      // Get all tables
      const tables = await db.getAllAsync<{name: string}>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      
      setDbStatus({
        initialized: !!version,
        tables: tables.map(t => t.name),
      });
    } catch (error) {
      console.error('Error checking database:', error);
      setDbStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  };

  const resetDatabase = async () => {
    try {
      setTestResults(null);
      
      // Clear stored keys first
      try {
        await SecureStore.deleteItemAsync('nostr_privkey');
        console.log('[Database Reset] Cleared stored Nostr keys');
      } catch (keyError) {
        console.warn('[Database Reset] Error clearing keys:', keyError);
      }
      
      // Define explicit type for tables
      let tables: { name: string }[] = [];
      
      // Try to get existing tables
      try {
        tables = await db.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        );
        console.log(`[Database Reset] Found ${tables.length} tables to drop`);
      } catch (tableListError) {
        console.warn('[Database Reset] Error listing tables:', tableListError);
        // Initialize with empty array if query fails
        tables = [];
      }
      
      // Drop tables one by one
      for (const table of tables) {
        try {
          await db.execAsync(`DROP TABLE IF EXISTS "${table.name}";`);
          console.log(`[Database Reset] Dropped table: ${table.name}`);
        } catch (dropError) {
          console.error(`[Database Reset] Error dropping table ${table.name}:`, dropError);
        }
      }
      
      // Use a delay to allow any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a completely new database instance instead of using the existing one
      // This will bypass the "Access to closed resource" issue
      Alert.alert(
        'Database Tables Dropped',
        'All database tables have been dropped. The app needs to be restarted to complete the reset process.',
        [
          { 
            text: 'Restart Now', 
            style: 'destructive',
            onPress: () => {
              // In a production app, you would use something like RN's DevSettings.reload()
              // For Expo, we'll suggest manual restart
              Alert.alert(
                'Manual Restart Required',
                'Please completely close the app and reopen it to finish the database reset.',
                [{ text: 'OK', style: 'default' }]
              );
            }
          }
        ]
      );
      
      setTestResults({
        success: true,
        message: 'Database tables dropped. Please restart the app to complete the reset.'
      });
      
    } catch (error) {
      console.error('[Database Reset] Error resetting database:', error);
      setTestResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during database reset'
      });
      
      // Still recommend a restart since the database might be in an inconsistent state
      Alert.alert(
        'Database Reset Error',
        'There was an error during database reset. Please restart the app and try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const runTestInsert = async () => {
    try {
      // Test exercise
      const testExercise = {
        title: "Test Squat",
        type: "strength",
        category: "Legs",
        equipment: "barbell",
        description: "Test exercise",
        tags: ["test", "legs"],
        format: {
          weight: true,
          reps: true
        },
        format_units: {
          weight: "kg",
          reps: "count"
        }
      };

      const timestamp = Date.now();
      
      // Insert exercise using withTransactionAsync
      await db.withTransactionAsync(async () => {
        // Insert exercise
        await db.runAsync(
          `INSERT INTO exercises (
            id, title, type, category, equipment, description,
            format_json, format_units_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'test-1',
            testExercise.title,
            testExercise.type,
            testExercise.category,
            testExercise.equipment || null,
            testExercise.description || null,
            JSON.stringify(testExercise.format),
            JSON.stringify(testExercise.format_units),
            timestamp,
            timestamp
          ]
        );

        // Insert tags
        for (const tag of testExercise.tags) {
          await db.runAsync(
            "INSERT INTO exercise_tags (exercise_id, tag) VALUES (?, ?)",
            ['test-1', tag]
          );
        }
      });

      // Verify insert
      const result = await db.getFirstAsync(
        "SELECT * FROM exercises WHERE id = ?",
        ['test-1']
      );

      setTestResults({
        success: true,
        message: `Successfully inserted and verified test exercise: ${JSON.stringify(result, null, 2)}`
      });

    } catch (error) {
      console.error('Test insert error:', error);
      setTestResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleApplyFilters = (filters: FilterOptions) => {
    setCurrentFilters(filters);
    const totalFilters = Object.values(filters).reduce(
      (acc, curr) => acc + curr.length, 
      0
    );
    setActiveFilters(totalFilters);
    // Implement filtering logic for programs when available
  };
  
  // NOSTR FUNCTIONS

  // Handle login dialog
  const handleShowLogin = () => {
    setIsLoginSheetOpen(true);
  };
  
  const handleCloseLogin = () => {
    setIsLoginSheetOpen(false);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      setStatusMessage('Logged out');
      setEvents([]);
    } catch (error) {
      console.error('Logout error:', error);
      setStatusMessage(`Logout error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Publish an event
  const handlePublishEvent = async () => {
    if (!isAuthenticated || !ndk || !currentUser) {
      setStatusMessage('You must login first');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Creating event...');
      
      // Prepare tags based on event kind
      const tags: string[][] = [];
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Add appropriate tags based on event kind
      if (eventKind === NostrEventKind.TEXT) {
        // For regular text notes, we can add some simple tags
        tags.push(
          ['t', 'powr'],  // Adding a hashtag
          ['t', 'test'],   // Another hashtag
          ['client', 'POWR App']  // Client info
        );
        
        // If no content was provided, use a default message
        if (!eventContent || eventContent.trim() === '') {
          setEventContent('Hello from POWR App - Test Note');
        }
      } else if (eventKind === NostrEventKind.EXERCISE) {
        const uniqueId = `exercise-${timestamp}`;
        tags.push(
          ['d', uniqueId],
          ['title', eventContent || 'Test Exercise'],
          ['type', 'strength'],
          ['category', 'Legs'],
          ['format', 'weight', 'reps'],
          ['format_units', 'kg', 'count'],
          ['equipment', 'barbell'],
          ['t', 'test'],
          ['t', 'powr']
        );
      } else if (eventKind === NostrEventKind.TEMPLATE) {
        const uniqueId = `template-${timestamp}`;
        tags.push(
          ['d', uniqueId],
          ['title', eventContent || 'Test Workout Template'],
          ['type', 'strength'],
          ['t', 'strength'],
          ['t', 'legs'],
          ['t', 'powr'],
          // Add exercise references - these would normally reference real exercise events
          ['exercise', `33401:exercise-${timestamp-1}`, '3', '10', 'normal']
        );
      } else if (eventKind === NostrEventKind.WORKOUT) {
        const uniqueId = `workout-${timestamp}`;
        const startTime = timestamp - 3600; // 1 hour ago
        tags.push(
          ['d', uniqueId],
          ['title', eventContent || 'Test Workout Record'],
          ['start', `${startTime}`],
          ['end', `${timestamp}`],
          ['completed', 'true'],
          ['t', 'powr'],
          // Add exercise data - these would normally reference real exercise events
          ['exercise', `33401:exercise-${timestamp-1}`, '100', '10', '8', 'normal']
        );
      }
      
      // Use the NDK store's publishEvent function
      const content = eventContent || `Test ${eventKind === NostrEventKind.TEXT ? 'note' : 'event'} from POWR App`;
      const event = await useNDKStore.getState().publishEvent(eventKind, content, tags);
      
      if (event) {
        // Add the published event to our display list
        const displayEvent: DisplayEvent = {
          id: event.id || '',
          pubkey: event.pubkey,
          kind: event.kind || eventKind, // Add fallback to eventKind if kind is undefined
          created_at: event.created_at || Math.floor(Date.now() / 1000), // Add fallback timestamp
          content: event.content,
          tags: event.tags.map(tag => tag.map(item => String(item))),
          sig: event.sig
        };
        
        setEvents(prev => [displayEvent, ...prev]);
        
        // Clear content field
        setEventContent('');
        setStatusMessage('Event published successfully!');
      } else {
        setStatusMessage('Failed to publish event');
      }
    } catch (error) {
      console.error('Error publishing event:', error);
      setStatusMessage(`Error publishing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Query events from NDK
  const queryEvents = async () => {
    if (!ndk) {
      setStatusMessage('NDK not initialized');
      return;
    }
    
    setLoading(true);
    setEvents([]);
    
    try {
      // Create a filter for the specific kind
      const filter = { kinds: [eventKind as number], limit: 20 };
      
      // Get events using NDK
      const fetchedEvents = await useNDKStore.getState().fetchEventsByFilter(filter);
      
      const displayEvents: DisplayEvent[] = [];
      fetchedEvents.forEach(event => {
        // Ensure we handle potentially undefined values
        displayEvents.push({
          id: event.id || '',
          pubkey: event.pubkey,
          kind: event.kind || eventKind, // Use eventKind as fallback
          created_at: event.created_at || Math.floor(Date.now() / 1000), // Use current time as fallback
          content: event.content,
          // Convert tags to string[][]
          tags: event.tags.map(tag => tag.map(item => String(item))),
          sig: event.sig
        });
      });
            
      setEvents(displayEvents);
      setStatusMessage(`Fetched ${displayEvents.length} events`);
    } catch (error) {
      console.error('Error querying events:', error);
      setStatusMessage(`Error querying: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Search bar with filter button */}
      <View className="px-4 py-2 border-b border-border">
        <View className="flex-row items-center">
          <View className="relative flex-1">
            <View className="absolute left-3 z-10 h-full justify-center">
              <Search size={18} className="text-muted-foreground" />
            </View>
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search programs"
              className="pl-9 pr-10 bg-muted/50 border-0"
            />
            <View className="absolute right-2 z-10 h-full justify-center">
              <Button 
                variant="ghost" 
                size="icon"
                onPress={() => setFilterSheetOpen(true)}
              >
                <View className="relative">
                  <ListFilter className="text-muted-foreground" size={20} />
                  {activeFilters > 0 && (
                    <View className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f7931a' }} />
                  )}
                </View>
              </Button>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Sheet */}
      <FilterSheet 
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        options={currentFilters}
        onApplyFilters={handleApplyFilters}
        availableFilters={availableFilters}
      />

      {/* Custom Tab Bar */}
      <View className="flex-row mx-4 mt-4 bg-card rounded-lg overflow-hidden">
        <TouchableOpacity 
          className={`flex-1 flex-row items-center justify-center py-3 ${activeTab === 'database' ? 'bg-primary' : ''}`}
          onPress={() => setActiveTab('database')}
        >
          <Database size={18} className={`mr-2 ${activeTab === 'database' ? 'text-white' : 'text-foreground'}`} />
          <Text className={activeTab === 'database' ? 'text-white' : 'text-foreground'}>Database</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className={`flex-1 flex-row items-center justify-center py-3 ${activeTab === 'nostr' ? 'bg-primary' : ''}`}
          onPress={() => setActiveTab('nostr')}
        >
          <Zap size={18} className={`mr-2 ${activeTab === 'nostr' ? 'text-white' : 'text-foreground'}`} />
          <Text className={activeTab === 'nostr' ? 'text-white' : 'text-foreground'}>Nostr</Text>
        </TouchableOpacity>
      </View>
        
      {/* Tab Content */}
      {activeTab === 'database' && (
        <ScrollView className="flex-1 p-4">
          <View className="py-4 space-y-4">
            <Text className="text-lg font-semibold text-center mb-4">Programs Coming Soon</Text>
            <Text className="text-center text-muted-foreground mb-6">
              Training programs will allow you to organize your workouts into structured training plans.
            </Text>
            
            <Text className="text-lg font-semibold text-center mb-4">Database Debug Panel</Text>
            
            {/* Schema Inspector Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <Code size={20} className="text-foreground" />
                  <Text className="text-lg font-semibold">Database Schema ({Platform.OS})</Text>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <View className="space-y-4">
                  {schemas.map((table) => (
                    <View key={table.name} className="space-y-2">
                      <Text className="font-semibold">{table.name}</Text>
                      <Text className="text-muted-foreground text-sm">
                        {table.sql}
                      </Text>
                    </View>
                  ))}
                </View>
                <Button 
                  className="mt-4"
                  onPress={inspectDatabase}
                >
                  <Text className="text-primary-foreground">Refresh Schema</Text>
                </Button>
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <Database size={20} className="text-foreground" />
                  <Text className="text-lg font-semibold">Database Status</Text>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <View className="space-y-2">
                  <Text>Initialized: {dbStatus.initialized ? '✅' : '❌'}</Text>
                  <Text>Tables Found: {dbStatus.tables.length}</Text>
                  <View className="pl-4">
                    {dbStatus.tables.map(table => (
                      <Text key={table} className="text-muted-foreground">• {table}</Text>
                    ))}
                  </View>
                  {dbStatus.error && (
                    <View className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive">
                      <View className="flex-row items-center gap-2">
                        <AlertCircle className="text-destructive" size={20} />
                        <Text className="font-semibold text-destructive">Error</Text>
                      </View>
                      <Text className="mt-2 text-destructive">{dbStatus.error}</Text>
                    </View>
                  )}
                </View>
              </CardContent>
            </Card>

            {/* Operations Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <RefreshCcw size={20} className="text-foreground" />
                  <Text className="text-lg font-semibold">Database Operations</Text>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <View className="space-y-4">
                  <Button 
                    onPress={runTestInsert}
                    className="w-full"
                  >
                    <Text className="text-primary-foreground">Run Test Insert</Text>
                  </Button>
                  
                  <Button 
                    onPress={resetDatabase}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 size={18} className="mr-2" />
                    <Text className="text-destructive-foreground">Reset Database</Text>
                  </Button>
                  
                  {testResults && (
                    <View className={`mt-4 p-4 rounded-lg border ${
                      testResults.success 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-destructive/10 border-destructive'
                    }`}>
                      <View className="flex-row items-center gap-2">
                        {testResults.success ? (
                          <CheckCircle2 
                            className="text-primary" 
                            size={20} 
                          />
                        ) : (
                          <AlertCircle 
                            className="text-destructive" 
                            size={20} 
                          />
                        )}
                        <Text className={`font-semibold ${
                          testResults.success ? 'text-primary' : 'text-destructive'
                        }`}>
                          {testResults.success ? "Success" : "Error"}
                        </Text>
                      </View>
                      <ScrollView className="mt-2">
                        <Text className={`${
                          testResults.success ? 'text-foreground' : 'text-destructive'
                        }`}>
                          {testResults.message}
                        </Text>
                      </ScrollView>
                    </View>
                  )}
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      )}
      {activeTab === 'nostr' && (
        <ScrollView className="flex-1 p-4">
          <View className="py-4 space-y-4">
            <Text className="text-lg font-semibold text-center mb-4">Nostr Integration Test</Text>
            
            {/* Connection status and controls */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <Wifi size={20} className="text-foreground" />
                  <Text className="text-lg font-semibold">Nostr Connection</Text>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <View className="flex-row gap-4 mb-4">
                  <Button
                    className="flex-1"
                    onPress={handleShowLogin}
                    disabled={isAuthenticated || loading}
                  >
                    <Text className="text-primary-foreground">Login with Nostr</Text>
                  </Button>
                  
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onPress={handleLogout}
                    disabled={!isAuthenticated || loading}
                  >
                    <Text className="text-destructive-foreground">Logout</Text>
                  </Button>
                </View>
                
                <Text className={`mt-2 ${
                  relayStatus === RelayStatus.CONNECTED 
                    ? 'text-green-500' 
                    : relayStatus === RelayStatus.ERROR 
                      ? 'text-red-500'
                      : 'text-yellow-500'
                }`}>
                  Status: {relayStatus}
                </Text>
                
                {statusMessage ? (
                  <Text className="mt-2 text-muted-foreground">{statusMessage}</Text>
                ) : null}
                
                {isAuthenticated && currentUser && (
                  <View className="mt-4 p-4 rounded-lg bg-muted">
                    <Text className="font-medium">Logged in as:</Text>
                    <Text className="text-sm text-muted-foreground mt-1" numberOfLines={1}>{currentUser.npub}</Text>
                    {currentUser.profile?.displayName && (
                      <Text className="text-sm mt-1">{currentUser.profile.displayName}</Text>
                    )}
                    
                    {/* Display active relay */}
                    <Text className="font-medium mt-3">Active Relay:</Text>
                    <Text className="text-sm text-muted-foreground">wss://powr.duckdns.org</Text>
                    <Text className="text-xs text-muted-foreground mt-1">
                      Note: To publish to additional relays, update them in stores/ndk.ts
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>
            
            {/* NostrLoginSheet component */}
            <NostrLoginSheet 
              open={isLoginSheetOpen} 
              onClose={handleCloseLogin} 
            />
            
            {/* Create Event */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <Zap size={20} className="text-foreground" />
                  <Text className="text-lg font-semibold">Create Event</Text>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="mb-1 font-medium">Event Kind:</Text>
                <View className="flex-row gap-2 mb-4 flex-wrap">
                  <Button
                    variant={eventKind === NostrEventKind.TEXT ? "default" : "outline"}
                    onPress={() => setEventKind(NostrEventKind.TEXT)}
                    size="sm"
                  >
                    <Text className={eventKind === NostrEventKind.TEXT ? "text-white" : ""}>Text Note</Text>
                  </Button>
                  
                  <Button
                    variant={eventKind === NostrEventKind.EXERCISE ? "default" : "outline"}
                    onPress={() => setEventKind(NostrEventKind.EXERCISE)}
                    size="sm"
                  >
                    <Text className={eventKind === NostrEventKind.EXERCISE ? "text-white" : ""}>Exercise</Text>
                  </Button>
                  
                  <Button
                    variant={eventKind === NostrEventKind.TEMPLATE ? "default" : "outline"}
                    onPress={() => setEventKind(NostrEventKind.TEMPLATE)}
                    size="sm"
                  >
                    <Text className={eventKind === NostrEventKind.TEMPLATE ? "text-white" : ""}>Template</Text>
                  </Button>
                  
                  <Button
                    variant={eventKind === NostrEventKind.WORKOUT ? "default" : "outline"}
                    onPress={() => setEventKind(NostrEventKind.WORKOUT)}
                    size="sm"
                  >
                    <Text className={eventKind === NostrEventKind.WORKOUT ? "text-white" : ""}>Workout</Text>
                  </Button>
                </View>
                
                <Text className="mb-1 font-medium">Content:</Text>
                <TextInput
                  value={eventContent}
                  onChangeText={setEventContent}
                  placeholder="Event content"
                  multiline
                  numberOfLines={4}
                  className="border border-gray-300 dark:border-gray-700 rounded-md p-2 mb-4 min-h-24"
                />
                
                <View className="flex-row gap-4">
                  <Button
                    onPress={handlePublishEvent}
                    disabled={!isAuthenticated || loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <><ActivityIndicator size="small" color="#fff" /><Text className="text-white ml-2">Publishing...</Text></>
                    ) : (
                      <Text className="text-white">Publish Event</Text>
                    )}
                  </Button>
                  
                  <Button
                    onPress={queryEvents}
                    disabled={!isAuthenticated || loading}
                    variant="outline"
                    className="flex-1"
                  >
                    <Text>Query Events</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
            
            {/* Event List */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <Database size={20} className="text-foreground" />
                  <Text className="text-lg font-semibold">Recent Events</Text>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading && events.length === 0 ? (
                  <View className="items-center justify-center p-4">
                    <ActivityIndicator size="large" />
                    <Text className="mt-2">Loading events...</Text>
                  </View>
                ) : events.length === 0 ? (
                  <View className="items-center justify-center p-4">
                    <Text className="text-muted-foreground">No events yet</Text>
                  </View>
                ) : (
                  <ScrollView className="p-4" style={{ maxHeight: 300 }}>
                    {events.map((event, index) => (
                      <View key={event.id || index} className="mb-4">
                        <Text className="font-bold">
                          Kind: {event.kind} | Created: {new Date(event.created_at * 1000).toLocaleString()}
                        </Text>
                        <Text className="mb-1">ID: {event.id}</Text>
                        <Text className="mb-1">Pubkey: {event.pubkey.slice(0, 8)}...</Text>
                        
                        {/* Display tags */}
                        {event.tags && event.tags.length > 0 && (
                          <View className="mb-1">
                            <Text className="font-medium">Tags:</Text>
                            {event.tags.map((tag, tagIndex) => (
                              <Text key={tagIndex} className="ml-2">
                                {tag.join(', ')}
                              </Text>
                            ))}
                          </View>
                        )}
                        
                        <Text className="font-medium">Content:</Text>
                        <Text className="ml-2 mb-2">{event.content}</Text>
                        
                        {/* Display signature */}
                        {event.sig && (
                          <Text className="text-xs text-muted-foreground">
                            Signature: {event.sig.slice(0, 16)}...
                          </Text>
                        )}
                        
                        {index < events.length - 1 && <Separator className="my-2" />}
                      </View>
                    ))}
                  </ScrollView>
                )}
              </CardContent>
            </Card>
              
            {/* Event JSON Viewer */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <FileJson size={20} className="text-foreground" />
                  <Text className="text-lg font-semibold">Event Details</Text>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {events.length > 0 ? (
                  <View>
                    <Text className="font-medium mb-2">Selected Event (Latest):</Text>
                    <ScrollView 
                      className="border border-border p-2 rounded-md"
                      style={{ maxHeight: 200 }}
                    >
                      <Text className="font-mono">
                        {JSON.stringify(events[0], null, 2)}
                      </Text>
                    </ScrollView>
                  </View>
                ) : (
                  <Text className="text-muted-foreground">No events to display</Text>
                )}
              </CardContent>
            </Card>
              
            {/* Testing Guide */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <AlertCircle size={20} className="text-foreground" />
                  <Text className="text-lg font-semibold">Testing Guide</Text>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="font-medium mb-2">How to test Nostr integration:</Text>
                <View className="space-y-2">
                  <Text>1. Click "Login with Nostr" to authenticate</Text>
                  <Text>2. On the login sheet, click "Generate Key" to create a new Nostr identity</Text>
                  <Text>3. Login with the generated keys</Text>
                  <Text>4. Select an event kind (Text Note, Exercise, Template, or Workout)</Text>
                  <Text>5. Enter optional content and click "Publish"</Text>
                  <Text>6. Use "Query Events" to fetch existing events of the selected kind</Text>
                  <Text className="mt-2 text-muted-foreground">Using NDK Mobile for Nostr integration provides a more reliable experience with proper cryptographic operations.</Text>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      )}
    </View>
  );
}