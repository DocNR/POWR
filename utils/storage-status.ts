// utils/storage-status.ts
import { ContentAvailability, StorageSource } from '@/types/shared';
import { formatDistanceToNow } from 'date-fns';

export interface StorageStatus {
  icon: string;  // Feather icon name
  label: string;
  color: string;
  details?: string;
}

export function getStorageStatus(availability: ContentAvailability): StorageStatus {
  const sources = availability.source;
  
  // No sources - remote only content
  if (!sources.length) {
    return {
      icon: 'cloud',
      label: 'Remote',
      color: 'gray',
      details: 'Available online only'
    };
  }

  // Check Nostr status
  if (sources.includes('nostr')) {
    const nostrData = availability.lastSynced?.nostr;
    return {
      icon: 'zap',
      label: 'Published',
      color: 'purple',
      details: nostrData ? 
        `Published ${formatDistanceToNow(nostrData.timestamp)} ago` : 
        'Published to Nostr'
    };
  }

  // Check backup status
  if (sources.includes('backup')) {
    const backupTime = availability.lastSynced?.backup;
    return {
      icon: 'cloud-check',
      label: 'Backed Up',
      color: 'green',
      details: backupTime ? 
        `Backed up ${formatDistanceToNow(backupTime)} ago` : 
        'Backed up to cloud'
    };
  }

  // Local only
  return {
    icon: 'hard-drive',
    label: 'Local',
    color: 'orange',
    details: 'Stored on device only'
  };
}

export function shouldPromptForBackup(availability: ContentAvailability): boolean {
  // Prompt if content is only local and hasn't been backed up in last 24 hours
  return (
    availability.source.length === 1 && 
    availability.source[0] === 'local' &&
    (!availability.lastSynced?.backup || 
     Date.now() - availability.lastSynced.backup > 24 * 60 * 60 * 1000)
  );
}