// lib/hooks/useFeedMonitor.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface FeedMonitorOptions {
  enabled?: boolean;
  visibilityThreshold?: number;
  refreshInterval?: number;
  onRefresh?: () => Promise<void>;
}

export function useFeedMonitor(options: FeedMonitorOptions = {}) {
  const {
    enabled = true,
    visibilityThreshold = 60000, // 1 minute
    refreshInterval = 300000, // 5 minutes
    onRefresh
  } = options;
  
  const [isVisible, setIsVisible] = useState(true);
  const lastVisibleTimestampRef = useRef(Date.now());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle app state changes
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      const now = Date.now();
      const lastVisible = lastVisibleTimestampRef.current;
      const timeSinceLastVisible = now - lastVisible;
      
      // If the app was in background for longer than threshold, refresh
      if (timeSinceLastVisible > visibilityThreshold && onRefresh) {
        onRefresh();
      }
      
      setIsVisible(true);
      lastVisibleTimestampRef.current = now;
    } else if (nextAppState === 'background') {
      setIsVisible(false);
    }
  }, [visibilityThreshold, onRefresh]);
  
  // Set up app state monitoring
  useEffect(() => {
    if (!enabled) return;
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [enabled, handleAppStateChange]);
  
  // Set up periodic refresh
  useEffect(() => {
    if (!enabled || !onRefresh) return;
    
    const startRefreshTimer = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      
      refreshTimerRef.current = setTimeout(async () => {
        if (isVisible) {
          await onRefresh();
        }
        startRefreshTimer();
      }, refreshInterval);
    };
    
    startRefreshTimer();
    
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [enabled, isVisible, refreshInterval, onRefresh]);
  
  return {
    isVisible,
    refresh: onRefresh
  };
}