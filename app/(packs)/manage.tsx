// app/(packs)/manage.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { POWRPackWithContent } from '@/types/powr-pack';
// Fix database context import
import { usePOWRPackService } from '@/components/DatabaseProvider';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, PackageOpen, Plus } from 'lucide-react-native';

export default function ManagePOWRPacksScreen() {
  const powrPackService = usePOWRPackService();
  const [packs, setPacks] = useState<POWRPackWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [keepItems, setKeepItems] = useState(true);

  // Load imported packs
  useEffect(() => {
    loadPacks();
  }, []);

  // Function to load imported packs
  const loadPacks = async () => {
    setIsLoading(true);
    try {
      const importedPacks = await powrPackService.getImportedPacks();
      setPacks(importedPacks);
    } catch (error) {
      console.error('Error loading packs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle import button click
  const handleImport = () => {
    router.push('/(packs)/import');
  };

  // Handle delete button click
  const handleDeleteClick = (packId: string) => {
    setSelectedPackId(packId);
    setShowDeleteDialog(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedPackId) return;

    try {
      await powrPackService.deletePack(selectedPackId, keepItems);
      // Refresh the list
      loadPacks();
    } catch (error) {
      console.error('Error deleting pack:', error);
    } finally {
      setShowDeleteDialog(false);
      setSelectedPackId(null);
    }
  };

  // Format import date
  const formatImportDate = (timestamp: number): string => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Manage POWR Packs',
          headerShown: true,
        }} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Import button - fix icon usage */}
        <Button
          onPress={handleImport}
          className="mb-4"
        >
          <Plus size={18} color="#fff" className="mr-2" />
          <Text className="text-primary-foreground">Import New Pack</Text>
        </Button>

        {/* No packs message */}
        {!isLoading && packs.length === 0 && (
          <Card>
            <CardContent className="py-8 items-center">
              <PackageOpen size={48} color="#6b7280" />
              <Text className="text-lg font-medium mt-4 text-center">No POWR Packs Imported</Text>
              <Text className="text-center mt-2 text-gray-500">
                Import workout packs shared by the community to get started.
              </Text>
              <Button 
                onPress={handleImport} 
                className="mt-4"
                variant="outline"
              >
                <Text>Import Your First Pack</Text>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pack list */}
        {packs.map((packWithContent) => {
          const { pack, templates, exercises } = packWithContent;
          
          return (
            <Card key={pack.id} className="mb-4">
              <CardHeader>
                <View style={styles.cardHeaderContent}>
                  <View style={styles.cardHeaderText}>
                    <CardTitle>
                      <Text className="text-lg font-semibold">{pack.title}</Text>
                    </CardTitle>
                    {pack.description && (
                      <CardDescription>
                        <Text className="text-muted-foreground">{pack.description}</Text>
                      </CardDescription>
                    )}
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleDeleteClick(pack.id)}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </CardHeader>
              <CardContent>
                <View style={styles.statsRow}>
                  <Text className="text-gray-500">
                    {templates.length} template{templates.length !== 1 ? 's' : ''} • {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Separator className="my-2" />
                <Text className="text-sm text-gray-500">
                  Imported {formatImportDate(pack.importDate)}
                </Text>
              </CardContent>
            </Card>
          );
        })}
      </ScrollView>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pack?</AlertDialogTitle>
            <AlertDialogDescription>
              <Text>
                This will remove the POWR Pack from your library. Do you want to keep the imported exercises and templates?
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <View style={styles.dialogOptions}>
              <Button
                variant={keepItems ? "default" : "outline"}
                onPress={() => setKeepItems(true)}
                className="flex-1 mr-2"
              >
                <Text className={keepItems ? "text-primary-foreground" : ""}>
                  Keep Items
                </Text>
              </Button>
              <Button
                variant={!keepItems ? "default" : "outline"}
                onPress={() => setKeepItems(false)}
                className="flex-1"
              >
                <Text className={!keepItems ? "text-primary-foreground" : ""}>
                  Delete All
                </Text>
              </Button>
            </View>
            <View style={styles.dialogActions}>
              <AlertDialogCancel asChild>
                <Button variant="outline" className="mr-2">
                  <Text>Cancel</Text>
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant="destructive" onPress={handleDeleteConfirm}>
                  <Text className="text-destructive-foreground">Confirm</Text>
                </Button>
              </AlertDialogAction>
            </View>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  cardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardHeaderText: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dialogOptions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  }
});