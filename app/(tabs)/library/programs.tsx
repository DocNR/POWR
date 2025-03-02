// app/(tabs)/library/programs.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TextInput, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertCircle, CheckCircle2, Database, RefreshCcw, Trash2, 
  Code, Search, ListFilter, Wifi, Zap, FileJson
} from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { ExerciseType, ExerciseCategory, Equipment } from '@/types/exercise';
import { SQLTransaction, SQLResultSet, SQLError } from '@/lib/db/types';
import { schema } from '@/lib/db/schema';
import { FilterSheet, type FilterOptions, type SourceType } from '@/components/library/FilterSheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getPublicKey } from 'nostr-tools';

// Constants for Nostr
const EVENT_KIND_EXERCISE = 33401;
const EVENT_KIND_WORKOUT_TEMPLATE = 33402;
const EVENT_KIND_WORKOUT_RECORD = 1301;

// Simplified mock implementations for testing
const generatePrivateKey = (): string => {
  // Generate a random hex string (32 bytes)
  return Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

const getEventHash = (event: any): string => {
  // For testing, just create a mock hash
  const eventData = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content
  ]);
  
  // Simple hash function for demonstration
  return Array.from(eventData)
    .reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0)
    .toString(16)
    .padStart(64, '0');
};

const signEvent = (event: any, privateKey: string): string => {
  // In real implementation, this would sign the event hash with the private key
  // For testing, we'll just return a mock signature
  return Array.from({ length: 128 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

interface NostrEvent {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
}

interface TableInfo {
  name: string;
}

interface TableSchema {
  name: string;
  sql: string;
}

interface SchemaVersion {
  version: number;
}

interface ExerciseRow {
  id: string;
  title: string;
  type: string;
  category: string;
  equipment: string | null;
  description: string | null;
  created_at: number;
  updated_at: number;
  format_json: string;
  format_units_json: string;
}

// Default available filters for programs - can be adjusted later
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
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [testResults, setTestResults] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>(initialFilters);
  const [activeFilters, setActiveFilters] = useState(0);
  
  // Nostr state
  const [relayUrl, setRelayUrl] = useState('ws://localhost:7777');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [useGeneratedKeys, setUseGeneratedKeys] = useState(true);
  const [eventKind, setEventKind] = useState(EVENT_KIND_EXERCISE);
  const [eventContent, setEventContent] = useState('');
  
  // WebSocket reference
  const socketRef = useRef<WebSocket | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('database');

  useEffect(() => {
    checkDatabase();
    inspectDatabase();
    generateKeys();
  }, []);

  // DATABASE FUNCTIONS
  
  const inspectDatabase = async () => {
    try {
      const result = await db.getAllAsync<TableSchema>(
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
      const version = await db.getFirstAsync<SchemaVersion>(
        'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
      );
      
      // Get all tables
      const tables = await db.getAllAsync<TableInfo>(
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
      await db.withTransactionAsync(async () => {
        // Drop all tables
        const tables = await db.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        );
        
        for (const { name } of tables) {
          await db.execAsync(`DROP TABLE IF EXISTS ${name}`);
        }
        
        // Recreate schema
        await schema.createTables(db);
      });
      
      setTestResults({
        success: true,
        message: 'Database reset successfully'
      });
      
      // Refresh database status
      checkDatabase();
      inspectDatabase();
    } catch (error) {
      console.error('Error resetting database:', error);
      setTestResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during reset'
      });
    }
  };

  const runTestInsert = async () => {
    try {
      // Test exercise
      const testExercise = {
        title: "Test Squat",
        type: "strength" as ExerciseType,
        category: "Legs" as ExerciseCategory,
        equipment: "barbell" as Equipment,
        description: "Test exercise",
        tags: ["test", "legs"],
        format: {
          weight: true,
          reps: true
        },
        format_units: {
          weight: "kg" as const,
          reps: "count" as const
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
      const result = await db.getFirstAsync<ExerciseRow>(
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
  
  // Generate new keypair
  const generateKeys = () => {
    try {
      const privKey = generatePrivateKey();
      // For getPublicKey, we can use a mock function that returns a valid-looking pubkey
      const pubKey = privKey.slice(0, 64); // Just use part of the private key for demo
      
      setPrivateKey(privKey);
      setPublicKey(pubKey);
      setStatusMessage('Keys generated successfully');
    } catch (error) {
      setStatusMessage(`Error generating keys: ${error}`);
    }
  };
  
  // Connect to relay
  const connectToRelay = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    
    setConnecting(true);
    setStatusMessage('Connecting to relay...');
    
    try {
      const socket = new WebSocket(relayUrl);
      
      socket.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setStatusMessage('Connected to relay!');
        socketRef.current = socket;
        
        // Subscribe to exercise-related events
        const subscriptionId = 'test-sub-' + Math.random().toString(36).substring(2, 15);
        const subscription = JSON.stringify([
          'REQ', 
          subscriptionId,
          { kinds: [EVENT_KIND_EXERCISE, EVENT_KIND_WORKOUT_TEMPLATE, EVENT_KIND_WORKOUT_RECORD], limit: 10 }
        ]);
        socket.send(subscription);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data[0] === 'EVENT' && data[1] && data[2]) {
            const nostrEvent = data[2];
            setEvents(prev => [nostrEvent, ...prev].slice(0, 50)); // Keep most recent 50 events
          } else if (data[0] === 'NOTICE') {
            setStatusMessage(`Relay message: ${data[1]}`);
          }
        } catch (error) {
          console.error('Error parsing message:', error, event.data);
        }
      };
      
      socket.onclose = () => {
        setConnected(false);
        setConnecting(false);
        setStatusMessage('Disconnected from relay');
      };
      
      socket.onerror = (error) => {
        setConnected(false);
        setConnecting(false);
        setStatusMessage(`Connection error: ${error}`);
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      setConnecting(false);
      setStatusMessage(`Failed to connect: ${error}`);
      console.error('Connection setup error:', error);
    }
  };
  
  // Disconnect from relay
  const disconnectFromRelay = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
  };
  
  // Create and publish a new event
  const publishEvent = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setStatusMessage('Not connected to a relay');
      return;
    }
    
    if (!privateKey || !publicKey) {
      setStatusMessage('Need private and public keys to publish');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create event with required pubkey (no longer optional)
      const event: NostrEvent = {
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        kind: eventKind,
        tags: [],
        content: eventContent,
      };
      
      // A basic implementation for each event kind
      if (eventKind === EVENT_KIND_EXERCISE) {
        event.tags.push(['d', `exercise-${Date.now()}`]);
        event.tags.push(['title', 'Test Exercise']);
        event.tags.push(['format', 'weight', 'reps']);
        event.tags.push(['format_units', 'kg', 'count']);
        event.tags.push(['equipment', 'barbell']);
      } else if (eventKind === EVENT_KIND_WORKOUT_TEMPLATE) {
        event.tags.push(['d', `template-${Date.now()}`]);
        event.tags.push(['title', 'Test Workout Template']);
        event.tags.push(['type', 'strength']);
      } else if (eventKind === EVENT_KIND_WORKOUT_RECORD) {
        event.tags.push(['d', `workout-${Date.now()}`]);
        event.tags.push(['title', 'Test Workout Record']);
        event.tags.push(['start', `${Math.floor(Date.now() / 1000) - 3600}`]);
        event.tags.push(['end', `${Math.floor(Date.now() / 1000)}`]);
      }
      
      // Hash and sign
      event.id = getEventHash(event);
      event.sig = signEvent(event, privateKey);
      
      // Publish to relay
      const message = JSON.stringify(['EVENT', event]);
      socketRef.current.send(message);
      
      setStatusMessage('Event published successfully!');
      setEventContent('');
      setLoading(false);
    } catch (error) {
      setStatusMessage(`Error publishing event: ${error}`);
      setLoading(false);
    }
  };
  
  // Query events from relay
  const queryEvents = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setStatusMessage('Not connected to a relay');
      return;
    }
    
    try {
      setEvents([]);
      setLoading(true);
      
      // Create a new subscription for the selected event kind
      const subscriptionId = 'query-' + Math.random().toString(36).substring(2, 15);
      const subscription = JSON.stringify([
        'REQ', 
        subscriptionId,
        { kinds: [eventKind], limit: 20 }
      ]);
      
      socketRef.current.send(subscription);
      setStatusMessage(`Querying events of kind ${eventKind}...`);
      
      // Close this subscription after 5 seconds
      setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify(['CLOSE', subscriptionId]));
          setLoading(false);
          setStatusMessage(`Completed query for kind ${eventKind}`);
        }
      }, 5000);
    } catch (error) {
      setLoading(false);
      setStatusMessage(`Error querying events: ${error}`);
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
            
            {/* Connection controls */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <Wifi size={20} className="text-foreground" />
                  <Text className="text-lg font-semibold">Relay Connection</Text>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={relayUrl}
                  onChangeText={setRelayUrl}
                  placeholder="wss://relay.example.com"
                  className="mb-4"
                />
                
                <View className="flex-row gap-4">
                  <Button
                    onPress={connectToRelay}
                    disabled={connecting || connected}
                    className="flex-1"
                  >
                    {connecting ? (
                      <><ActivityIndicator size="small" color="#fff" /><Text className="text-white ml-2">Connecting...</Text></>
                    ) : (
                      <Text className="text-white">Connect</Text>
                    )}
                  </Button>
                  
                  <Button
                    onPress={disconnectFromRelay}
                    disabled={!connected}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Text className="text-white">Disconnect</Text>
                  </Button>
                </View>
                
                <Text className={`mt-2 ${connected ? 'text-green-500' : 'text-red-500'}`}>
                  Status: {connected ? 'Connected' : 'Disconnected'}
                </Text>
                
                {statusMessage ? (
                  <Text className="mt-2 text-gray-500">{statusMessage}</Text>
                ) : null}
              </CardContent>
            </Card>
            
            {/* Keys */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex-row items-center gap-2">
                  <Code size={20} className="text-foreground" />
                  <Text className="text-lg font-semibold">Nostr Keys</Text>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <View className="flex-row items-center mb-4">
                  <Switch
                    checked={useGeneratedKeys}
                    onCheckedChange={setUseGeneratedKeys}
                    id="use-generated-keys"
                  />
                  <Label htmlFor="use-generated-keys" className="ml-2">Use generated keys</Label>
                  <Button
                    onPress={generateKeys}
                    className="ml-auto"
                    variant="outline"
                    size="sm"
                  >
                    <Text>Generate New Keys</Text>
                  </Button>
                </View>
                
                <Text className="mb-1 font-medium">Public Key:</Text>
                <Input
                  value={publicKey}
                  onChangeText={setPublicKey}
                  placeholder="Public key (hex)"
                  editable={!useGeneratedKeys}
                  className={`mb-4 ${useGeneratedKeys ? 'opacity-70' : ''}`}
                />
                
                <Text className="mb-1 font-medium">Private Key:</Text>
                <Input
                  value={privateKey}
                  onChangeText={setPrivateKey}
                  placeholder="Private key (hex)"
                  editable={!useGeneratedKeys}
                  className={`mb-2 ${useGeneratedKeys ? 'opacity-70' : ''}`}
                />
                <Text className="text-xs text-muted-foreground">Note: Never share your private key in a production app</Text>
              </CardContent>
            </Card>
            
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
                <View className="flex-row gap-2 mb-4">
                  <Button
                    variant={eventKind === EVENT_KIND_EXERCISE ? "default" : "outline"}
                    onPress={() => setEventKind(EVENT_KIND_EXERCISE)}
                    size="sm"
                  >
                    <Text className={eventKind === EVENT_KIND_EXERCISE ? "text-white" : ""}>Exercise</Text>
                  </Button>
                  
                  <Button
                    variant={eventKind === EVENT_KIND_WORKOUT_TEMPLATE ? "default" : "outline"}
                    onPress={() => setEventKind(EVENT_KIND_WORKOUT_TEMPLATE)}
                    size="sm"
                  >
                    <Text className={eventKind === EVENT_KIND_WORKOUT_TEMPLATE ? "text-white" : ""}>Template</Text>
                  </Button>
                  
                  <Button
                    variant={eventKind === EVENT_KIND_WORKOUT_RECORD ? "default" : "outline"}
                    onPress={() => setEventKind(EVENT_KIND_WORKOUT_RECORD)}
                    size="sm"
                  >
                    <Text className={eventKind === EVENT_KIND_WORKOUT_RECORD ? "text-white" : ""}>Workout</Text>
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
                    onPress={publishEvent}
                    disabled={!connected || loading}
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
                    disabled={!connected || loading}
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
                  <ScrollView className="p-4" style={{ maxHeight: 200 }}>
                    {events.map((event, index) => (
                      <View key={event.id || index} className="mb-4">
                        <Text className="font-bold">
                          Kind: {event.kind} | Created: {new Date(event.created_at * 1000).toLocaleString()}
                        </Text>
                        <Text className="mb-1">ID: {event.id}</Text>
                        
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
              
            {/* How To Use Guide */}
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
                  <Text>1. Start local strfry relay using:</Text>
                  <Text className="ml-4 font-mono bg-muted p-2 rounded">./strfry relay</Text>
                  <Text>2. Connect to the relay (ws://localhost:7777)</Text>
                  <Text>3. Generate or enter Nostr keys</Text>
                  <Text>4. Create and publish test events</Text>
                  <Text>5. Query for existing events</Text>
                  <Text className="mt-2 text-muted-foreground">For details, see the Nostr Integration Testing Guide</Text>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      )}
    </View>
  );
}