// lib/hooks/usePOWRpacks.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { usePOWRPackService } from '@/components/DatabaseProvider';
import { useNDK } from '@/lib/hooks/useNDK';
import { POWRPackWithContent, POWRPackImport, POWRPackSelection } from '@/types/powr-pack';
import { usePackRefresh } from '@/lib/stores/libraryStore';

export function usePOWRPacks() {
  const powrPackService = usePOWRPackService();
  const { ndk } = useNDK();
  const { refreshCount, refreshPacks, isLoading, setLoading } = usePackRefresh();
  
  const [packs, setPacks] = useState<POWRPackWithContent[]>([]);
  
  // Load all packs
  const loadPacks = useCallback(async () => {
    setLoading(true);
    try {
      const importedPacks = await powrPackService.getImportedPacks();
      setPacks(importedPacks);
      return importedPacks;
    } catch (error) {
      console.error('Error loading POWR packs:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [powrPackService, setLoading]);
  
  // Load packs when refreshCount changes
  useEffect(() => {
    loadPacks();
  }, [refreshCount, loadPacks]);
  
  // Fetch a pack from an naddr
  const fetchPack = useCallback(async (naddr: string): Promise<POWRPackImport | null> => {
    if (!ndk) {
      Alert.alert('Error', 'NDK is not initialized');
      return null;
    }
    
    try {
      return await powrPackService.fetchPackFromNaddr(naddr, ndk);
    } catch (error) {
      console.error('Error fetching pack:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to fetch pack');
      return null;
    }
  }, [ndk, powrPackService]);
  
  // Import a pack with selected items
  const importPack = useCallback(async (packImport: POWRPackImport, selection: POWRPackSelection) => {
    try {
      await powrPackService.importPack(packImport, selection);
      // No need to call loadPacks here as the store refresh will trigger it
      return true;
    } catch (error) {
      console.error('Error importing pack:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to import pack');
      return false;
    }
  }, [powrPackService]);
  
  // Delete a pack
  const deletePack = useCallback(async (packId: string) => {
    try {
      // Always delete everything
      await powrPackService.deletePack(packId, false);
      // No need to call loadPacks here as the store refresh will trigger it
      return true;
    } catch (error) {
      console.error('Error deleting pack:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete pack');
      return false;
    }
  }, [powrPackService]);
  
  // Helper to copy pack address to clipboard (for future implementation)
  const copyPackAddress = useCallback((naddr: string) => {
    // We would implement clipboard functionality here
    // For now, this is a placeholder for future enhancement
    console.log('Would copy to clipboard:', naddr);
    return true;
  }, []);
  
  return {
    packs,
    isLoading,
    loadPacks,
    fetchPack,
    importPack,
    deletePack,
    copyPackAddress,
    refreshPacks // Return the refresh function from the store
  };
}