# POWR App Logging System

This document describes the logging system implemented in the POWR app, including how it helps reduce console noise while preserving important logs for debugging.

## Overview

The POWR app uses a configurable logging system that allows for fine-grained control over log output. The system:

- Supports multiple log levels (ERROR, WARN, INFO, DEBUG, VERBOSE)
- Provides module-based filtering to enable/disable logs from specific components
- Defaults to a reduced noise configuration in both development and production
- Offers runtime configuration for debugging specific modules

## Key Features

### Log Levels

The system supports the following log levels, in order of increasing verbosity:

1. **ERROR** (0): Critical errors only
2. **WARN** (1): Errors and warnings
3. **INFO** (2): Normal operational information
4. **DEBUG** (3): Detailed debugging information
5. **VERBOSE** (4): Extremely detailed diagnostic information

### Module Filtering

Logs are categorized by module to allow selective filtering. By default, the following module types are disabled:

- **Social Feed modules**: SocialFeed, SocialFeedCache, SocialFeed.EventProcessing
- **Database modules**: SQLite, Database, Schema
- **Network modules**: NDK, RelayService, RelayStore

### Quiet Mode

The system includes a `setQuietMode` function that can be used to toggle between minimal (errors only) and normal logging. This is useful during app initialization when many operations generate a large volume of logs.

## Usage Examples

### Basic Logging

```typescript
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MyComponent');

// Usage with different log levels
logger.error('This is an error message');
logger.warn('This is a warning');
logger.info('This is an informational message');
logger.debug('This is a debug message');
logger.verbose('This is a verbose message');
```

### Quiet Mode

```typescript
import { setQuietMode } from '@/lib/utils/logger';

// Only show error messages
setQuietMode(true);

// Restore normal logging
setQuietMode(false);
```

### Enabling/Disabling Modules

```typescript
import { enableModule, disableModule } from '@/lib/utils/logger';

// Enable logs from a specific module
enableModule('SocialFeed');

// Disable logs from a module
disableModule('Database');
```

## Implementation

The logging system is implemented in `lib/utils/logger.ts`. Key components include:

1. The `LogLevel` enum defining available log levels
2. The `createLogger` function for creating module-specific loggers
3. Configuration for disabled modules that is applied application-wide
4. The `setQuietMode` function for global logging level control

## Troubleshooting

If you need to see logs from a specific module while debugging:

1. Use the Chrome/Safari developer console filter to search for specific module names
2. Enable logging for a specific module: `enableModule('ModuleName')`
3. Temporarily disable quiet mode: `setQuietMode(false)`
4. Adjust the global log level: `setLogLevel(LogLevel.DEBUG)`

## Best Practices

1. Create module-specific loggers with meaningful names 
2. Use appropriate log levels (ERROR, WARN, INFO, DEBUG, VERBOSE)
3. Provide context in messages to make them more useful
4. Avoid logging sensitive information
5. Structure log messages to be easily searchable
