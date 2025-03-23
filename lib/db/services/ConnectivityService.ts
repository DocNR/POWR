// lib/services/ConnectivityService.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { openDatabaseSync } from 'expo-sqlite';

/**
 * Service to monitor network connectivity and provide status information
 */
export class ConnectivityService {
  private static instance: ConnectivityService;
  private isOnline: boolean = false;
  private lastOnlineTime: number | null = null;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private syncListeners: Set<() => void> = new Set();
  private checkingStatus: boolean = false;
  private offlineMode: boolean = false;
  
  // Singleton pattern
  static getInstance(): ConnectivityService {
    if (!ConnectivityService.instance) {
      ConnectivityService.instance = new ConnectivityService();
    }
    return ConnectivityService.instance;
  }
  
  private constructor() {
    // Initialize network monitoring
    this.setupNetworkMonitoring();
  }
  
  /**
   * Setup network state change monitoring
   */
  private setupNetworkMonitoring(): void {
    // Subscribe to network state updates
    NetInfo.addEventListener(this.handleNetworkChange);
    
    // Initial network check
    this.checkNetworkStatus();
  }
  
  /**
   * Handle network state changes
   */
  private handleNetworkChange = (state: NetInfoState): void => {
    // Skip if in forced offline mode
    if (this.offlineMode) {
      return;
    }
    
    const previousStatus = this.isOnline;
    const newOnlineStatus = state.isConnected === true && state.isInternetReachable !== false;
    
    // Only trigger updates if status actually changed
    if (this.isOnline !== newOnlineStatus) {
      this.isOnline = newOnlineStatus;
      
      // Update last online time if we're going online
      if (newOnlineStatus) {
        this.lastOnlineTime = Date.now();
      }
      
      this.updateStatusInDatabase(newOnlineStatus);
      this.notifyListeners();
      
      // If we're coming back online, trigger sync
      if (newOnlineStatus && !previousStatus) {
        console.log('[ConnectivityService] Network connection restored, triggering sync');
        this.triggerSync();
      }
    }
  }
  
  /**
   * Perform a network status check
   * This can be called manually to force a check
   */
  async checkNetworkStatus(): Promise<boolean> {
    // Skip if already checking
    if (this.checkingStatus) {
      return this.isOnline;
    }
    
    // Skip if in forced offline mode
    if (this.offlineMode) {
      return false;
    }
    
    try {
      this.checkingStatus = true;
      
      // First get the network state from NetInfo
      const state = await NetInfo.fetch();
      
      // Perform a more thorough check if NetInfo says we're connected
      let isReachable = state.isConnected === true && state.isInternetReachable !== false;
      
      // If NetInfo says we're connected, do an additional check with a fetch request
      if (isReachable) {
        try {
          // Try to fetch a small resource with a timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          // Use a reliable endpoint that should always be available
          const response = await fetch('https://www.google.com/generate_204', {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache',
          });
          
          clearTimeout(timeoutId);
          
          // If we get a response, we're definitely online
          isReachable = response.status === 204 || response.ok;
        } catch (fetchError) {
          // If the fetch fails, we might not have real connectivity
          console.log('[ConnectivityService] Fetch check failed:', fetchError);
          isReachable = false;
        }
      }
      
      const previousStatus = this.isOnline;
      this.isOnline = isReachable;
      
      // Update last online time if we're online
      if (this.isOnline) {
        this.lastOnlineTime = Date.now();
      }
      
      // Update database and notify if status changed
      if (previousStatus !== this.isOnline) {
        this.updateStatusInDatabase(this.isOnline);
        this.notifyListeners();
        
        // If we're coming back online, trigger sync
        if (this.isOnline && !previousStatus) {
          console.log('[ConnectivityService] Network connection restored, triggering sync');
          this.triggerSync();
        }
      }
      
      return this.isOnline;
    } catch (error) {
      console.error('[ConnectivityService] Error checking network status:', error);
      this.isOnline = false;
      return false;
    } finally {
      this.checkingStatus = false;
    }
  }
  
  /**
   * Set forced offline mode (for testing or battery saving)
   */
  setOfflineMode(enabled: boolean): void {
    this.offlineMode = enabled;
    
    if (enabled) {
      // Force offline status
      const previousStatus = this.isOnline;
      this.isOnline = false;
      
      // Update database and notify if status changed
      if (previousStatus) {
        this.updateStatusInDatabase(false);
        this.notifyListeners();
      }
    } else {
      // Re-check network status when disabling offline mode
      this.checkNetworkStatus();
    }
  }
  
  /**
   * Update online status in the database
   */
  private async updateStatusInDatabase(isOnline: boolean): Promise<void> {
    try {
      const db = openDatabaseSync('powr.db');
      
      // Create the app_status table if it doesn't exist
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS app_status (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at INTEGER
        )
      `);
      
      await db.runAsync(
        `INSERT OR REPLACE INTO app_status (key, value, updated_at)
         VALUES (?, ?, ?)`,
        ['online_status', isOnline ? 'online' : 'offline', Date.now()]
      );
      
      // Also store last online time if we're online
      if (isOnline && this.lastOnlineTime) {
        await db.runAsync(
          `INSERT OR REPLACE INTO app_status (key, value, updated_at)
           VALUES (?, ?, ?)`,
          ['last_online_time', this.lastOnlineTime.toString(), Date.now()]
        );
      }
    } catch (error) {
      console.error('[ConnectivityService] Error updating status in database:', error);
    }
  }
  
  /**
   * Notify all registered listeners of connectivity change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOnline);
      } catch (error) {
        console.error('[ConnectivityService] Error in listener:', error);
      }
    });
  }
  
  /**
   * Trigger sync operations when coming back online
   */
  private triggerSync(): void {
    this.syncListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[ConnectivityService] Error in sync listener:', error);
      }
    });
  }
  
  /**
   * Get current network connectivity status
   */
  getConnectionStatus(): boolean {
    return this.isOnline;
  }
  
  /**
   * Get the last time the device was online
   */
  getLastOnlineTime(): number | null {
    return this.lastOnlineTime;
  }
  
  /**
   * Register a listener for connectivity changes
   */
  addListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    
    // Return function to remove the listener
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Register a sync listener that will be called when connectivity is restored
   */
  addSyncListener(listener: () => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }
}

/**
 * React hook for using connectivity status in components
 */
export function useConnectivity() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // Initialize with current status
    return ConnectivityService.getInstance().getConnectionStatus();
  });
  
  const [lastOnlineTime, setLastOnlineTime] = useState<number | null>(() => {
    // Initialize with last online time
    return ConnectivityService.getInstance().getLastOnlineTime();
  });
  
  // Use a ref to track if we're currently checking connectivity
  const isCheckingRef = useRef(false);
  
  useEffect(() => {
    // Register listener for updates
    const removeListener = ConnectivityService.getInstance().addListener((online) => {
      setIsOnline(online);
      if (online) {
        setLastOnlineTime(Date.now());
      }
    });
    
    // Perform an initial check when the component mounts
    if (!isCheckingRef.current) {
      isCheckingRef.current = true;
      ConnectivityService.getInstance().checkNetworkStatus()
        .then(online => {
          setIsOnline(online);
          if (online) {
            setLastOnlineTime(Date.now());
          }
        })
        .finally(() => {
          isCheckingRef.current = false;
        });
    }
    
    // Set up periodic checks while the component is mounted
    const intervalId = setInterval(() => {
      if (!isCheckingRef.current) {
        isCheckingRef.current = true;
        ConnectivityService.getInstance().checkNetworkStatus()
          .then(online => {
            setIsOnline(online);
            if (online) {
              setLastOnlineTime(Date.now());
            }
          })
          .finally(() => {
            isCheckingRef.current = false;
          });
      }
    }, 30000); // Check every 30 seconds
    
    // Clean up on unmount
    return () => {
      removeListener();
      clearInterval(intervalId);
    };
  }, []);
  
  // Function to manually check network status
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current) return isOnline;
    
    isCheckingRef.current = true;
    try {
      const online = await ConnectivityService.getInstance().checkNetworkStatus();
      setIsOnline(online);
      if (online) {
        setLastOnlineTime(Date.now());
      }
      return online;
    } finally {
      isCheckingRef.current = false;
    }
  }, [isOnline]);
  
  return { 
    isOnline, 
    lastOnlineTime,
    checkConnection
  };
}
