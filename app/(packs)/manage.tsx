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
import { usePOWRPackService } from '@/components/DatabaseProvider';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, PackageOpen, Plus, X } from 'lucide-react-native';
import { useIconColor } from '@/lib/theme/iconUtils';
import { useColorScheme } from '@/lib/theme/useColorScheme';
import { COLORS } from '@/lib/theme/colors';
import { FIXED_COLORS } from '@/lib/theme/colors';

export default function ManagePOWRPacksScreen() {
  const powrPackService = usePOWRPackService();
  const [packs, setPacks] = useState<POWRPackWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { getIconProps } = useIconColor();
  const { isDarkColorScheme } = useColorScheme();

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

  // Handle close button press
  const handleClose = () => {
    router.back();
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
      // Always delete everything (we no longer need the keepItems parameter)
      await powrPackService.deletePack(selectedPackId, false);
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
          // Add a close button for iOS
          headerRight: () => (
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X {...getIconProps('primary')} size={24} />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Import button */}
        <Button
          onPress={handleImport}
          className="mb-4"
          style={{ backgroundColor: COLORS.purple.DEFAULT }}
        >
          <Text style={{ color: '#fff', fontWeight: '500' }}>Import New Pack</Text>
        </Button>

        {/* No packs message */}
        {!isLoading && packs.length === 0 && (
          <Card>
            <CardContent className="py-8 items-center">
              <PackageOpen size={48} {...getIconProps('muted')} />
              <Text className="text-lg font-medium mt-4 text-center text-foreground">No POWR Packs Imported</Text>
              <Text className="text-center mt-2 text-muted-foreground">
                Import workout packs shared by the community to get started.
              </Text>
              <Button 
                onPress={handleImport} 
                className="mt-4"
                style={{ backgroundColor: COLORS.purple.DEFAULT }}
              >
                <Text style={{ color: '#fff', fontWeight: '500' }}>Import Your First Pack</Text>
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
                      <Text className="text-lg font-semibold text-foreground">{pack.title}</Text>
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
                    <Trash2 {...getIconProps('destructive')} size={20} />
                  </TouchableOpacity>
                </View>
              </CardHeader>
              <CardContent>
                <View style={styles.statsRow}>
                  <Text className="text-muted-foreground">
                    {templates.length} template{templates.length !== 1 ? 's' : ''} • {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Separator className="my-2" />
                <Text className="text-sm text-muted-foreground">
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
            <AlertDialogTitle>
              <Text className="text-xl font-semibold text-foreground">Delete Pack</Text>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Text className="text-muted-foreground">
                This will remove the POWR Pack and all its associated templates and exercises from your library.
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <View className="flex-row justify-end gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="mr-2">
                <Text>Cancel</Text>
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="destructive" 
                onPress={handleDeleteConfirm}
                style={{ backgroundColor: FIXED_COLORS.destructive }}
              >
                <Text style={{ color: '#FFFFFF' }}>Delete Pack</Text>
              </Button>
            </AlertDialogAction>
          </View>
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
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    padding: 8,
  }
});