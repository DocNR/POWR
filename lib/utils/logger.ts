// lib/utils/logger.ts
/**
 * Logging levels to control verbosity
 */
export enum LogLevel {
  ERROR = 0,  // Only errors
  WARN = 1,   // Errors and warnings
  INFO = 2,   // Normal operational information
  DEBUG = 3,  // Detailed information for debugging
  VERBOSE = 4 // Very detailed information
}

interface LogConfig {
  level: LogLevel;
  enabledModules: string[];
  disabledModules: string[];
}

/**
 * Global logging configuration
 */
const config: LogConfig = {
  level: __DEV__ ? LogLevel.WARN : LogLevel.WARN, // Using WARN even in dev mode to reduce logs
  enabledModules: [], // If empty, all non-disabled modules are enabled
  disabledModules: [
    // Social feed modules
    'SocialFeed.EventProcessing',
    'SocialFeedCache',
    'SocialFeed',
    'useFeedHooks',
    
    // Database modules
    'Database',
    'DB',
    'Schema',
    'SQLite',
    
    // Network & connection modules
    'NDK',
    'ContactCacheService',
    'RelayService',
    'ReactQueryAuthProvider',
    'RelayStore',
    'RelayInitializer'
  ] // Modules to disable by default
};

/**
 * Get the current logging level
 */
export function getLogLevel(): LogLevel {
  return config.level;
}

/**
 * Set the global logging level
 */
export function setLogLevel(level: LogLevel): void {
  config.level = level;
}

/**
 * Enable logging for specific module
 */
export function enableModule(moduleName: string): void {
  // Remove from disabled modules if present
  const index = config.disabledModules.indexOf(moduleName);
  if (index !== -1) {
    config.disabledModules.splice(index, 1);
  }
  
  // Add to enabled modules if not already there
  if (!config.enabledModules.includes(moduleName)) {
    config.enabledModules.push(moduleName);
  }
}

/**
 * Disable logging for specific module
 */
export function disableModule(moduleName: string): void {
  // Remove from enabled modules if present
  const index = config.enabledModules.indexOf(moduleName);
  if (index !== -1) {
    config.enabledModules.splice(index, 1);
  }
  
  // Add to disabled modules if not already there
  if (!config.disabledModules.includes(moduleName)) {
    config.disabledModules.push(moduleName);
  }
}

/**
 * Check if logging is enabled for the given module and level
 */
function isLoggingEnabled(moduleName: string, level: LogLevel): boolean {
  // Check if level is enabled
  if (level > config.level) {
    return false;
  }
  
  // Check if module is explicitly disabled
  if (config.disabledModules.includes(moduleName)) {
    return false;
  }
  
  // Check if we have a specific enabled list
  if (config.enabledModules.length > 0) {
    return config.enabledModules.includes(moduleName);
  }
  
  // If we get here, the module is not disabled and there's no specific enabled list
  return true;
}

/**
 * Create a logger for a specific module
 */
export function createLogger(moduleName: string) {
  return {
    error: (message: string, ...args: any[]) => {
      if (isLoggingEnabled(moduleName, LogLevel.ERROR)) {
        console.error(`[${moduleName}] ${message}`, ...args);
      }
    },
    
    warn: (message: string, ...args: any[]) => {
      if (isLoggingEnabled(moduleName, LogLevel.WARN)) {
        console.warn(`[${moduleName}] ${message}`, ...args);
      }
    },
    
    info: (message: string, ...args: any[]) => {
      if (isLoggingEnabled(moduleName, LogLevel.INFO)) {
        console.log(`[${moduleName}] ${message}`, ...args);
      }
    },
    
    debug: (message: string, ...args: any[]) => {
      if (isLoggingEnabled(moduleName, LogLevel.DEBUG)) {
        console.log(`[${moduleName}] ${message}`, ...args);
      }
    },
    
    verbose: (message: string, ...args: any[]) => {
      if (isLoggingEnabled(moduleName, LogLevel.VERBOSE)) {
        console.log(`[${moduleName}] ${message}`, ...args);
      }
    }
  };
}

/**
 * Enable only error logs to reduce noise during troubleshooting
 * @param enable Whether to enable quiet mode (only errors)
 */
export function setQuietMode(enable: boolean): void {
  if (enable) {
    // Save current log level before changing it
    const savedLevel = config.level;
    // Only show errors
    config.level = LogLevel.ERROR;
    console.log('🔇 Logger quiet mode enabled - only showing errors');
    return;
  } else {
    // Restore to INFO logs
    config.level = LogLevel.INFO;
    console.log('🔊 Logger quiet mode disabled - showing normal logs');
  }
}

// Create a default logger
export const logger = createLogger('App');

// Add some common module loggers
export const socialFeedLogger = createLogger('SocialFeed');
export const eventProcessingLogger = createLogger('SocialFeed.EventProcessing');
export const databaseLogger = createLogger('Database');
export const networkLogger = createLogger('Network');
export const authLogger = createLogger('Auth');
