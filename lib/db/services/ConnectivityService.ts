// lib/services/ConnectivityService.ts
import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { openDatabaseSync } from 'expo-sqlite';

/**
 * Service to monitor network connectivity and provide status information
 */
export class ConnectivityService {
  private static instance: ConnectivityService;
  private isOnline: boolean = false;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  
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
    const newOnlineStatus = state.isConnected === true && state.isInternetReachable !== false;
    
    // Only trigger updates if status actually changed
    if (this.isOnline !== newOnlineStatus) {
      this.isOnline = newOnlineStatus;
      this.updateStatusInDatabase(newOnlineStatus);
      this.notifyListeners();
    }
  }
  
  /**
   * Perform an initial network status check
   */
  private async checkNetworkStatus(): Promise<void> {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
      this.updateStatusInDatabase(this.isOnline);
    } catch (error) {
      console.error('[ConnectivityService] Error checking network status:', error);
      this.isOnline = false;
    }
  }
  
  /**
   * Update online status in the database
   */
  private async updateStatusInDatabase(isOnline: boolean): Promise<void> {
    try {
      const db = openDatabaseSync('powr.db');
      await db.runAsync(
        `INSERT OR REPLACE INTO app_status (key, value, updated_at)
         VALUES (?, ?, ?)`,
        ['online_status', isOnline ? 'online' : 'offline', Date.now()]
      );
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
   * Get current network connectivity status
   */
  getConnectionStatus(): boolean {
    return this.isOnline;
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
}

/**
 * React hook for using connectivity status in components
 */
export function useConnectivity() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // Initialize with current status
    return ConnectivityService.getInstance().getConnectionStatus();
  });
  
  useEffect(() => {
    // Register listener for updates
    const removeListener = ConnectivityService.getInstance().addListener(setIsOnline);
    
    // Clean up on unmount
    return removeListener;
  }, []);
  
  return { isOnline };
}