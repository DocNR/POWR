// app/(tabs)/library/programs.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Database, RefreshCcw, Trash2, Code, Search, ListFilter } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { ExerciseType, ExerciseCategory, Equipment } from '@/types/exercise';
import { SQLTransaction, SQLResultSet, SQLError } from '@/lib/db/types';
import { schema } from '@/lib/db/schema';
import { Platform } from 'react-native';
import { FilterSheet, type FilterOptions, type SourceType } from '@/components/library/FilterSheet';

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

  useEffect(() => {
    checkDatabase();
    inspectDatabase();
  }, []);

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
    </View>
  );
}