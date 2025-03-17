// app/(packs)/import.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { useNDK } from '@/lib/hooks/useNDK';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { nip19 } from 'nostr-tools'; // Fix import from nostr-tools
import { findTagValue } from '@/utils/nostr-utils';
import POWRPackService from '@/lib/db/services/POWRPackService';
import { usePOWRPackService } from '@/components/DatabaseProvider'; // Use the proper hook
import { POWRPackImport, POWRPackSelection } from '@/types/powr-pack';
import { InfoIcon } from 'lucide-react-native';

export default function ImportPOWRPackScreen() {
  const { ndk } = useNDK();
  const powrPackService = usePOWRPackService();
  const [naddrInput, setNaddrInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packData, setPackData] = useState<POWRPackImport | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [dependencies, setDependencies] = useState<Record<string, string[]>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Handle fetch button click
  const handleFetchPack = async () => {
    if (!naddrInput.trim()) {
      setError('Please enter a valid naddr');
      return;
    }

    if (!ndk) {
      setError('NDK is not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPackData(null);
    setSelectedTemplates([]);
    setSelectedExercises([]);
    setDependencies({});

    try {
      // Validate naddr format
      const isValid = naddrInput.startsWith('naddr1');
      if (!isValid) {
        throw new Error('Invalid naddr format. Should start with "naddr1"');
      }

      // Fetch pack data
      const packImport = await powrPackService.fetchPackFromNaddr(naddrInput, ndk);
      
      // Debug logging
      console.log("Fetched pack event:", packImport.packEvent.id);
      console.log("Templates count:", packImport.templates.length);
      console.log("Exercises count:", packImport.exercises.length);
      
      setPackData(packImport);

      // Analyze dependencies
      const deps = powrPackService.analyzeDependencies(packImport.templates, packImport.exercises);
      setDependencies(deps);

      // Pre-select all items
      setSelectedTemplates(packImport.templates.map(t => t.id));
      setSelectedExercises(packImport.exercises.map(e => e.id));
    } catch (err) {
      console.error('Error fetching pack:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pack');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle template selection change
  const handleTemplateChange = (templateId: string, isSelected: boolean) => {
    setSelectedTemplates(prev => {
      const updated = isSelected 
        ? [...prev, templateId]
        : prev.filter(id => id !== templateId);
      
      // Update required exercises
      updateRequiredExercises(updated);
      return updated;
    });
  };

  // Handle exercise selection change
  const handleExerciseChange = (exerciseId: string, isSelected: boolean) => {
    // Don't allow deselecting if it's required by a selected template
    if (!isSelected && isRequiredByTemplate(exerciseId)) {
      return;
    }

    setSelectedExercises(prev => 
      isSelected 
        ? [...prev, exerciseId]
        : prev.filter(id => id !== exerciseId)
    );
  };

  // Check if an exercise is required by any selected template
  const isRequiredByTemplate = (exerciseId: string): boolean => {
    return selectedTemplates.some(templateId => 
      dependencies[templateId]?.includes(exerciseId)
    );
  };

  // Update exercise selection based on template dependencies
  const updateRequiredExercises = (selectedTemplateIds: string[]) => {
    // Start with currently manually selected exercises
    const manuallySelected = selectedExercises.filter(id => 
      !Object.values(dependencies).flat().includes(id)
    );
    
    // Add all exercises required by selected templates
    const requiredExercises = selectedTemplateIds.flatMap(templateId => 
      dependencies[templateId] || []
    );
    
    // Combine manual selections with required ones, removing duplicates
    const allExercises = [...new Set([...manuallySelected, ...requiredExercises])];
    setSelectedExercises(allExercises);
  };

  // Handle import button click
  const handleImport = async () => {
    if (!packData) return;

    setIsImporting(true);
    setError(null);

    try {
      const packId = generatePackId();
      const selection: POWRPackSelection = {
        packId,
        selectedTemplates,
        selectedExercises,
        templateDependencies: dependencies
      };

      await powrPackService.importPack(packData, selection);
      setImportSuccess(true);
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (err) {
      console.error('Error importing pack:', err);
      setError(err instanceof Error ? err.message : 'Failed to import pack');
    } finally {
      setIsImporting(false);
    }
  };

  // Generate a unique pack ID
  const generatePackId = (): string => {
    return 'pack_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Get pack title from event
  const getPackTitle = (): string => {
    if (!packData?.packEvent) return 'Unknown Pack';
    return findTagValue(packData.packEvent.tags, 'name') || 'Unnamed Pack';
  };

  // Get pack description from event
  const getPackDescription = (): string => {
    if (!packData?.packEvent) return '';
    return findTagValue(packData.packEvent.tags, 'about') || packData.packEvent.content || '';
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Import POWR Pack',
          headerShown: true,
        }} 
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Input section */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Text className="text-xl font-semibold">Enter POWR Pack Address</Text>
            </CardTitle>
            <CardDescription>
              <Text className="text-muted-foreground">Paste a POWR Pack naddr to import</Text>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Helper text explaining naddr format */}
            <View className="mb-4">
              <Text className="text-sm text-muted-foreground">
                Paste a POWR Pack address (naddr1...) to import templates and exercises shared by the community.
              </Text>
            </View>
            <Input
              placeholder="naddr1..."
              value={naddrInput}
              onChangeText={setNaddrInput}
              style={styles.input}
            />
          </CardContent>
          <CardFooter>
            <Button 
              onPress={handleFetchPack} 
              disabled={isLoading || !naddrInput.trim()}
              className="w-full"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-primary-foreground">Fetch Pack</Text>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Error message */}
        {error && (
          <View className="mb-4 mt-4 p-4 bg-destructive/10 border border-destructive rounded-md flex-row items-center">
            <Text className="text-destructive ml-2">{error}</Text>
          </View>
        )}

        {/* Success message */}
        {importSuccess && (
          <View className="mb-4 mt-4 p-4 bg-green-50 border border-green-200 rounded-md flex-row items-center">
            <Text className="ml-2 text-green-800">Pack successfully imported!</Text>
          </View>
        )}

        {/* Pack content */}
        {packData && (
          <View style={styles.packContent}>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>
                  <Text className="text-xl font-semibold">{getPackTitle()}</Text>
                </CardTitle>
                {getPackDescription() ? (
                  <CardDescription>
                    <Text className="text-muted-foreground">{getPackDescription()}</Text>
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                <Text className="mb-2">Select items to import:</Text>
              </CardContent>
            </Card>

            {/* Templates section */}
            {packData.templates && packData.templates.length > 0 ? (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>
                    <Text className="text-lg font-semibold">Workout Templates</Text>
                  </CardTitle>
                  <CardDescription>
                    <Text className="text-muted-foreground">{packData.templates.length} templates available</Text>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {packData.templates.map(template => {
                    const title = findTagValue(template.tags, 'title') || 'Unnamed Template';
                    return (
                      <View key={template.id} style={styles.itemRow}>
                        <Checkbox
                          checked={selectedTemplates.includes(template.id)}
                          onCheckedChange={(checked) => 
                            handleTemplateChange(template.id, checked === true)
                          }
                          id={`template-${template.id}`}
                        />
                        <Text className="ml-2 flex-1" onPress={() => 
                          handleTemplateChange(template.id, !selectedTemplates.includes(template.id))
                        }>
                          {title}
                        </Text>
                      </View>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-4">
                <CardContent>
                  <Text className="text-center text-muted-foreground py-4">No templates available in this pack</Text>
                </CardContent>
              </Card>
            )}

            {/* Exercises section */}
            {packData.exercises && packData.exercises.length > 0 ? (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>
                    <Text className="text-lg font-semibold">Exercises</Text>
                  </CardTitle>
                  <CardDescription>
                    <Text className="text-muted-foreground">{packData.exercises.length} exercises available</Text>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {packData.exercises.map(exercise => {
                    const title = findTagValue(exercise.tags, 'title') || 'Unnamed Exercise';
                    const isRequired = isRequiredByTemplate(exercise.id);
                    
                    return (
                      <View key={exercise.id} style={styles.itemRow}>
                        <Checkbox
                          checked={selectedExercises.includes(exercise.id)}
                          onCheckedChange={(checked) => 
                            handleExerciseChange(exercise.id, checked === true)
                          }
                          disabled={isRequired}
                          id={`exercise-${exercise.id}`}
                        />
                        <Text 
                          className={`ml-2 flex-1 ${isRequired ? 'font-medium' : ''}`} 
                          onPress={() => {
                            if (!isRequired) {
                              handleExerciseChange(exercise.id, !selectedExercises.includes(exercise.id))
                            }
                          }}
                        >
                          {title}
                        </Text>
                        {isRequired && (
                          <View style={styles.requiredBadge}>
                            <InfoIcon size={14} color="#6b7280" />
                            <Text className="text-xs text-gray-500 ml-1">Required</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-4">
                <CardContent>
                  <Text className="text-center text-muted-foreground py-4">No exercises available in this pack</Text>
                </CardContent>
              </Card>
            )}

            {/* Import button */}
            <Button 
              onPress={handleImport} 
              disabled={isImporting || (selectedTemplates.length === 0 && selectedExercises.length === 0)}
              className="w-full"
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-primary-foreground">
                  Import {selectedTemplates.length + selectedExercises.length} Items
                </Text>
              )}
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  input: {
    marginBottom: 16,
  },
  packContent: {
    marginTop: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  }
});