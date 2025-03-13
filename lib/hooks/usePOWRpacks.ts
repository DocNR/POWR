// lib/hooks/usePOWRPacks.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { usePOWRPackService } from '@/components/DatabaseProvider';
import { useNDK } from '@/lib/hooks/useNDK';
import { POWRPackWithContent, POWRPackImport, POWRPackSelection } from '@/types/powr-pack';
import { router } from 'expo-router';

export function usePOWRPacks() {
  const powrPackService = usePOWRPackService();
  const { ndk } = useNDK();
  const [packs, setPacks] = useState<POWRPackWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load all packs
  const loadPacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const importedPacks = await powrPackService.getImportedPacks();
      setPacks(importedPacks);
      return importedPacks;
    } catch (error) {
      console.error('Error loading POWR packs:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [powrPackService]);
  
  // Load packs on mount
  useEffect(() => {
    loadPacks();
  }, [loadPacks]);
  
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
      await loadPacks(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error importing pack:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to import pack');
      return false;
    }
  }, [powrPackService, loadPacks]);
  
  // Delete a pack
  const deletePack = useCallback(async (packId: string, keepItems: boolean = false) => {
    try {
      await powrPackService.deletePack(packId, keepItems);
      await loadPacks(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error deleting pack:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete pack');
      return false;
    }
  }, [powrPackService, loadPacks]);
  
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
    copyPackAddress
  };
}