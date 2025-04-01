# Changelog
All notable changes to the POWR project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- External Signer Support for Android (NIP-55)
  - Added Amber integration for secure private key management
  - Created ExternalSignerUtils to detect external signer apps
  - Implemented NDKAmberSigner for NIP-55 protocol support
  - Enhanced NDK store with loginWithExternalSigner functionality
  - Exposed new authentication method through useNDKAuth hook
  - Added "Sign with Amber" option to login screen
  - Added comprehensive documentation in docs/technical/nostr/external-signers.md
  - Added technical documentation in docs/technical/nostr/amber-integration-fixes.md

### Fixed
- Android: Fixed Amber external signer integration issues
  - Added extensive logging to better diagnose communication issues
  - Improved error handling in `AmberSignerModule.kt`
  - Fixed intent construction to better follow NIP-55 protocol
  - Enhanced response handling with checks for URI parameters and intent extras
  - Added POWR-specific event kinds (1301, 33401, 33402) to permission requests
- Authentication state management issues
  - Fixed hook ordering inconsistencies when switching between authenticated and unauthenticated states
  - Enhanced profile overview screen with consistent hook calling patterns
  - Restructured UI rendering to avoid conditional hook calls
  - Improved error handling for external signer integration
  - Fixed "Rendered more hooks than during the previous render" error during login/logout
- Android-specific login issues
  - Fixed private key validation to handle platform-specific string formatting
  - Added special handling for nsec key format on Android
  - Added hardcoded solution for specific test nsec key
  - Improved validation flow to properly handle keys in different formats
  - Enhanced error messages with detailed debugging information
  - Added platform-specific key handling for consistent cross-platform experience
  - Ensured both external signer and direct key login methods work properly
- TestFlight preparation: Added production flag in theme constants
- TestFlight preparation: Hid development-only Programs tab in production builds
- TestFlight preparation: Removed debug UI and console logs from social feed in production builds


# Changelog - March 28, 2025

## Added
- Real-time follower and following counts in Profile screen
  - Integrated with nostr.band API for comprehensive network statistics
  - Created NostrBandService for efficient API interaction
  - Implemented useProfileStats hook with auto-refresh capabilities
  - Added proper loading states and error handling
  - Created documentation in the new documentation structure
- iOS TestFlight build configuration
  - Created comprehensive TestFlight submission documentation
  - Added production and preview build profiles to eas.json
  - Added TestFlight submission configuration
  - Created deployment documentation in docs/deployment/ios_testflight_guide.md

## Improved
- Enhanced Profile UI
  - Reorganized profile screen layout for better information hierarchy
  - Improved npub display with better sharing options
  - Added inline copy and QR buttons for better usability
  - Enhanced visual consistency across profile elements
  - Replaced hardcoded follower counts with real-time data
- Updated project configuration for TestFlight
  - Updated outdated packages (expo, expo-dev-client, expo-file-system, expo-router, expo-sqlite, jest-expo)
  - Removed unmaintained packages (expo-random)
  - Removed unnecessary packages (@types/react-native)
  - Fixed updates URL in app.json to use the correct project ID
  - Documented workflow conflict between managed and bare configurations

## Fixed
- Prebuild/managed workflow conflict documentation
  - Added detailed explanation of the configuration issue
  - Documented future decision points for project architecture
  - Provided options for resolving the configuration conflict

# Changelog - March 26, 2025

## Fixed
- Authentication state management issues
  - Fixed runtime error when signing out from social screens
  - Enhanced useSocialFeed hook with better subscription management
  - Improved NDK logout process with proper subscription cleanup
  - Added deep comparison for subscription parameters to prevent unnecessary resubscriptions
  - Implemented exponential backoff for subscription attempts
  - Enhanced error handling in subscription lifecycle
  - Fixed React hooks order issues in social components
  - Added proper cleanup of subscriptions during authentication state changes
  - Increased logout delay to ensure proper cleanup of resources
  - Added type-safe access to NDK internal properties
  - Fixed "Rendered fewer hooks than expected" error during logout
  - Ensured consistent hook call order in social feed components
  - Improved subscription cleanup timing in NDK store
  - Enhanced state management during authentication transitions
  - Added better subscription tracking and cleanup in logout process

# Changelog - March 25, 2025

## Added
- NDK Mobile Cache Integration Plan
  - Created comprehensive cache management documentation
  - Designed profile image caching system
  - Planned publication queue service enhancements
  - Outlined social feed caching improvements
  - Documented workout history caching strategy
  - Planned exercise library and template caching
  - Designed contact list and following caching
  - Outlined general media cache service
  - Created detailed testing strategy documentation
  - Implemented ProfileImageCache service with NDK integration
  - Enhanced UserAvatar component to use cached profile images
  - Updated EnhancedSocialPost to use UserAvatar for profile images
  - Fixed NDK initialization to properly set NDK in ProfileImageCache
  - Removed draft articles (kind 30024) from all feeds

## Fixed
- Social feed subscription issues
  - Consolidated multiple separate subscriptions into a single subscription
  - Fixed infinite subscription loop in POWR feed
  - Removed tag filtering for POWR account to ensure all content is displayed
  - Improved timestamp handling to prevent continuous resubscription
  - Enhanced logging for better debugging
  - Removed old feed implementation in favor of unified useSocialFeed hook
  - Added proper subscription cleanup to prevent memory leaks
  - Implemented write buffer system to prevent transaction conflicts
  - Added LRU cache for tracking known events to prevent duplicates
  - Improved transaction management with withTransactionAsync
  - Added debounced subscriptions to prevent rapid resubscriptions
  - Enhanced error handling to prevent cascading failures
  - Added proper initialization of SocialFeedCache in RelayInitializer
  - Fixed following feed refresh issue that caused feed to reset unexpectedly
  - Implemented contact caching to prevent feed refresh loops
  - Added schema support for contact list caching (version 12)
  - Simplified feed refresh logic to prevent unnecessary subscription resets
  - Enhanced Following feed stability with improved contact management
  - Fixed database transaction conflicts between SocialFeedCache and ContactCacheService
  - Implemented global transaction lock mechanism to prevent nested transactions
  - Added transaction queue for coordinating database operations across services
  - Enhanced Following feed refresh logic with retry mechanism and better state tracking
  - Added safeguards to prevent multiple simultaneous refresh attempts
  - Improved error recovery in contact-based feed refreshes
- Enhanced Social Feed Filtering
  - Updated Community feed (formerly Global) with better content focus
  - Improved Following feed with consistent filtering rules
- Social Feed Caching Implementation
  - Created SocialFeedCache service for storing feed events
  - Enhanced SocialFeedService to use cache for offline access
  - Updated useSocialFeed hook to handle offline mode
  - Added offline indicator in social feed UI
  - Implemented automatic caching of viewed feed events
  - Added cache for referenced content (quoted posts)
  - Created documentation for social feed caching architecture
- Profile Image Caching Implementation
  - Created ProfileImageCache service for storing user avatars
  - Enhanced UserAvatar component to use cached images
  - Implemented automatic caching of viewed profile images
  - Added fallback to cached images when offline
  - Improved image loading performance with cache-first approach
  - Added cache expiration management for profile images
- Enhanced offline functionality
  - Added OfflineIndicator component for app-wide status display
  - Created SocialOfflineState component for graceful social feed degradation
  - Implemented WorkoutOfflineState component for workout screen fallbacks
  - Enhanced ConnectivityService with better network detection
  - Added offline mode detection in RelayInitializer
  - Implemented graceful fallbacks for unavailable content
  - Added cached data display when offline
  - Created user-friendly offline messaging
  - Added automatic switching between online and offline data sources

## Improved
- Social feed performance and reliability
  - Added SQLite-based caching for feed events
  - Implemented feed type tracking (following, powr, global)
  - Enhanced event processing with cache-first approach
  - Added automatic cache expiration (7-day default)
  - Improved referenced content resolution with caching
  - Enhanced offline user experience with cached content
  - Added connectivity-aware component rendering
  - Implemented automatic mode switching based on connectivity

- Splash screen reliability
  - Enhanced SimpleSplashScreen with better error handling
  - Improved platform detection for video vs. static splash
  - Added fallback mechanisms for failed image loading
  - Enhanced logging for better debugging
  - Fixed Android-specific issues with splash screen
- Offline user experience
  - Added visual indicators for offline state
  - Implemented graceful degradation of network-dependent features
  - Enhanced error handling for network failures
  - Added automatic retry mechanisms when connectivity is restored
  - Improved caching of previously viewed content
  - Enhanced state persistence during offline periods
  - Added connectivity-aware component rendering

## Fixed
- Text rendering in React Native components
  - Fixed "Text strings must be rendered within a <Text> component" error
  - Improved card component to properly handle text children
  - Enhanced error handling for text rendering issues
  - Added better component composition for text containers
- Network-related crashes
  - Fixed uncaught promise rejections in network requests
  - Added proper error boundaries for network-dependent components
  - Implemented timeout handling for stalled requests
  - Enhanced error messaging for network failures

# Changelog - March 24, 2025

## Added
- Unified workout history service and hook
  - Created `UnifiedWorkoutHistoryService` that combines functionality from multiple services
  - Implemented `useWorkoutHistory` hook for simplified data access
  - Added real-time Nostr updates with subscription support
  - Improved filtering capabilities across local and Nostr workouts
  - Enhanced type safety with better interfaces
  - Added comprehensive migration guide for developers

## Improved
- Consolidated workout history architecture
  - Reduced code duplication across services
  - Simplified API for accessing workout data
  - Enhanced performance with optimized database queries
  - Better error handling throughout the system
  - Improved documentation with migration examples
  - Enhanced calendar view with fallback filtering for dates

## Fixed
- Calendar view now properly shows workouts when clicking on dates
  - Added fallback mechanism to filter workouts manually if database query returns no results
  - Improved logging for better debugging
  - Fixed edge cases where workouts wouldn't appear in the calendar view

## Removed
- Legacy workout history services
  - Removed `EnhancedWorkoutHistoryService`
  - Removed `NostrWorkoutHistoryService`
  - Removed `useNostrWorkoutHistory` hook
  - Completed migration to unified workout history API

# Changelog - March 23, 2025

## Fixed
- History tab navigation issues
  - Fixed nested screens warning by renaming "history" screen to "workouts" in history tab
  - Updated initialRouteName to match the new screen name
  - Improved navigation between history tab and workout detail screen
- Workout detail screen improvements
  - Added timeout to prevent infinite loading state
  - Enhanced error handling with proper error state display
  - Added "Go Back" button for error recovery
  - Fixed TypeScript errors with proper imports
- Enhanced workout history service
  - Added detailed logging for exercise loading process
  - Added checks to verify if exercises exist in the database
  - Fixed TypeScript errors in exercise existence checks
  - Improved error handling throughout the service
- Calendar view UI and functionality
  - Fixed date highlighting shape to use clean circles instead of hexagons
  - Removed shadow effects causing visual distortion in calendar dates
  - Improved workout date detection with better fallback mechanisms
  - Enhanced exercise name display in workout cards

## Improved
- Enhanced debugging capabilities
  - Added comprehensive logging in EnhancedWorkoutHistoryService
  - Improved error state handling in workout detail screen
  - Better error messages for troubleshooting
- Calendar view reliability
  - Added fallback date filtering when database queries return no results
  - Improved workout date detection with combined data sources
  - Enhanced visual consistency of date highlighting

# Changelog - March 22, 2025

## Added
- Enhanced Profile Tab with new features
  - Implemented tabbed interface with Overview, Activity, Progress, and Settings
  - Added Terms of Service modal with comprehensive content
  - Created dedicated settings screen with improved organization
  - Added dark mode toggle in settings
  - Implemented proper text visibility in both light and dark modes
  - Added Nostr publishing settings with clear explanations
  - Created analytics service for workout progress tracking
  - Added progress visualization with charts and statistics
  - Implemented activity feed for personal workout history

## Fixed
- Dark mode text visibility issues
  - Added explicit text-foreground classes to ensure visibility
  - Updated button variants to use purple for better contrast
  - Fixed modal content visibility in dark mode
  - Improved component styling for consistent appearance
- TypeScript errors in navigation
  - Fixed router.push path format in SettingsDrawer
  - Updated import paths for better type safety
  - Improved component props typing

# Changelog - March 20, 2025

## Improved
- Enhanced Social Feed UI
  - Redesigned feed posts with divider-based layout instead of cards
  - Implemented edge-to-edge content display with hairline separators
  - Optimized post spacing for more compact, Twitter-like appearance
  - Reduced vertical padding between post elements
  - Tightened spacing between content and action buttons
  - Fixed image loading for POWR Pack images
  - Enhanced overall feed performance with component memoization
  - Improved empty state messaging
  - Fixed infinite loop issues in feed subscription management
  - Added proper feed reset and refresh functionality
  - Enhanced debugging tools for relay connection troubleshooting
  - Improved feed state management with proper lifecycle handling
  - Optimized rendering for long lists with virtualized FlatList
  - Added scrollToTop functionality for new content

## Fixed
- Template creation issue: preserved original exercise IDs when creating templates to ensure proper exercise references
  - Modified NewTemplateSheet to store full exercise objects
  - Updated handleAddTemplate to use original exercise IDs
  - Fixed type definitions to support enhanced template exercises

# Changelog - March 19, 2025

## Added
- Social Feed Integration
  - Implemented tabbed social feed with Following, POWR, and Global tabs
  - Created EnhancedSocialPost component for rendering workout events
  - Added support for viewing workout records, exercise templates, and workout templates
  - Implemented post interaction features (likes, comments)
  - Added workout detail screen for viewing complete workout information
  - Integrated with Nostr protocol for decentralized social content
  - Created SocialFeedService for fetching and managing social content
  - Implemented useFollowingFeed, usePOWRFeed, and useGlobalFeed hooks
  - Added user profile integration with avatar display
  - Created POWRPackSection for discovering shared workout templates

## Improved
- Enhanced profile handling
  - Added robust error management for profile image loading
  - Implemented proper state management to prevent infinite update loops
  - Better memory management with cleanup on component unmount
- Workout content display
  - Created rich workout event cards with detailed exercise information
  - Added support for displaying workout duration, exercises, and performance metrics
  - Implemented proper text handling for React Native
- Nostr integration
  - Added support for exercise, template, and workout event kinds
  - Implemented event parsing for different content types
  - Created useSocialFeed hook with pagination support
  - Enhanced NDK integration with better error handling
- UI/UX enhancements
  - Added pull-to-refresh for feed updates
  - Implemented load more functionality for pagination
  - Created skeleton loading states for better loading experience
  - Enhanced navigation between feed and detail screens

# Changelog - March 12, 2025

## Added
- POWR Packs - Shareable template and exercise collections
  - Implemented import/export system for workout content using Nostr protocol
  - Added database schema support for packs (tables: powr_packs, powr_pack_items)
  - Created POWRPackService for fetching, importing, and managing packs
  - Built NostrIntegration helper for conversion between Nostr events and local models
  - Implemented interface to browse and import workout packs from the community
  - Added pack management screen with import/delete functionality
  - Created pack discovery in POWR Community tab
  - Added dependency tracking for exercises required by templates
  - Implemented selective import with smart dependency management
  - Added clipboard support for sharing pack addresses

## Improved
- Enhanced Social experience
  - Added POWR Pack discovery to POWR Community tab
  - Implemented horizontal scrolling gallery for featured packs
  - Added loading states with skeleton UI
  - Improved visual presentation of shared content
- Settings drawer enhancements
  - Added POWR Packs management option
  - Improved navigation structure
- Nostr integration
  - Added support for NIP-51 lists (kind 30004)
  - Enhanced compatibility between app models and Nostr events
  - Improved type safety for Nostr operations
  - Better error handling for network operations
  - Expanded event type support for templates and exercises
  
# Changelog - March 9, 2025

## Added
- Relay management system
  - Added relays table to SQLite schema (version 3)
  - Created RelayService for database operations
  - Implemented RelayStore using Zustand for state management
  - Added compatibility layer for NDK and NDK-mobile
  - Added relay management UI in settings drawer
  - Implemented relay connection status tracking
  - Added support for read/write permissions
  - Created relay initialization system with defaults

## Improved
- Enhanced NDK initialization
  - Added proper relay configuration loading
  - Improved connection status tracking
  - Enhanced error handling for relay operations
- Settings drawer enhancements
  - Added relay management option
  - Improved navigation structure
  - Enhanced user interface
- NDK compatibility
  - Created universal interfaces for NDK implementations
  - Added type safety for complex operations
  - Improved error handling throughout relay management

# Changelog - March 8, 2025

## Added
- Database schema upgrade to version 5
  - Added workouts, workout_exercises, and workout_sets tables
  - Added templates and template_exercises tables
  - Added publication_queue table for offline-first functionality
  - Added app_status table for connectivity tracking
- New database services
  - WorkoutService for managing workout data persistence
  - Enhanced TemplateService for template management
  - NostrWorkoutService for Nostr event conversion
  - Updated PublicationQueueService for offline publishing
- React hooks for database access
  - useWorkouts hook for workout operations
  - useTemplates hook for template operations
- Improved workout completion flow
  - Three-tier storage approach (Local Only, Publish Complete, Publish Limited)
  - Template modification options (keep original, update, save as new)
  - Enhanced social sharing capabilities
  - Detailed workout summary with statistics
- Enhanced database debugging tools
  - Added proper error handling and logging
  - Improved transaction management
  - Added connectivity status tracking

## Fixed
- Missing workout and template table errors
- Incomplete data storage issues
- Template management synchronization
- Nostr event conversion between app models and Nostr protocol
- Workout persistence across app sessions
- Database transaction handling in workout operations
- Template reference handling in workout records

## Improved
- Workout store persistence layer
  - Enhanced integration with database services
  - Better error handling for database operations
  - Improved Nostr connectivity detection
- Template management workflow
  - Proper versioning and attribution
  - Enhanced modification tracking
  - Better user control over template sharing
- Overall data persistence architecture
  - Consistent service-based approach
  - Improved type safety
  - Enhanced error propagation
  
# Changelog - March 6, 2025

## Added
- Comprehensive workout completion flow
  - Implemented three-tier storage approach (Local Only, Publish Complete, Publish Limited)
  - Added support for template modifications with options to keep original, update, or save as new
  - Created celebration screen with confetti animation
  - Integrated social sharing capabilities for Nostr
  - Built detailed workout summary with achievement tracking
  - Added workout statistics including duration, volume, and set completion
  - Implemented privacy-focused publishing options
  - Added template attribution and modification tracking
- NDK mobile integration for Nostr functionality
  - Added event publishing and subscription capabilities 
  - Implemented proper type safety for NDK interactions
  - Created testing components for NDK functionality verification
- Enhanced exercise management with Nostr support
  - Implemented exercise creation, editing, and forking workflows
  - Added support for custom exercise event kinds (33401)
  - Built exercise publication queue for offline-first functionality
- User profile integration
  - Added profile fetching and caching
  - Implemented profile-based permissions for content editing
  - Fixed type definitions for NDK user profiles
- Robust workout state management
  - Fixed favorites persistence in SQLite
  - Added template-based workout initialization
  - Implemented workout tracking with real-time updates

## Fixed
- TypeScript errors across multiple components:
  - Resolved NDK-related type errors in ExerciseSheet component
  - Fixed FavoritesService reference errors in workoutStore
  - Corrected null/undefined handling in NDKEvent initialization
  - Fixed profile type compatibility in useProfile hook
  - Added proper type definitions for NDK UserProfile
- Dependency errors in PublicationQueue and DevSeeder services
- Source and authorization checks for exercise editing permissions
- Component interoperability with NDK mobile

## Improved
- Enhanced relay connection management
  - Added timeout-based connection attempts
  - Implemented better connection status tracking
  - Added relay connectivity verification before publishing
  - Improved error handling for publishing failures
- Workout completion UI
  - Added scrollable interfaces for better content accessibility
  - Enhanced visual feedback for selected options
  - Improved button placement and visual hierarchy
  - Added clearer visual indicators for selected storage options
- Refactored code for better type safety
- Enhanced error handling with proper type checking
- Improved Nostr event creation workflow with NDK
- Streamlined user authentication process
- Enhanced development environment with better type checking

## [Unreleased]

### Added
- Successful Nostr protocol integration
  - Implemented NDK-mobile for React Native compatibility
  - Added secure key management with Expo SecureStore
  - Created event signing and publishing functionality
  - Built relay connection management system
  - Implemented event caching for offline support
  - Added support for various Nostr event kinds (Text, Exercise, Template, Workout)
- Programs component for testing Nostr functionality
  - Created tabbed interface with Database and Nostr sections
  - Implemented user authentication flow
  - Added event creation with multiple event types
  - Built query functionality for retrieving events
  - Developed event display with detailed tag inspection
  - Added login/logout capabilities with secure key handling
- Enhanced crypto support for React Native environment
  - Implemented proper cryptographic polyfills
  - Added secure random number generation
  - Built robust key management system
  - Developed signer implementation for Nostr
- Zustand workout store for state management
  - Created comprehensive workout state store with Zustand
  - Implemented selectors for efficient state access
  - Added workout persistence and recovery
  - Built automatic timer management with background support
  - Developed minimization and maximization functionality
- Zustand workout store for state management
  - Created comprehensive workout state store with Zustand
  - Implemented selectors for efficient state access
  - Added workout persistence and recovery
  - Built automatic timer management with background support
  - Developed minimization and maximization functionality
- Workout tracking implementation with real-time tracking
  - Added workout timer with proper background handling
  - Implemented rest timer functionality
  - Added exercise set tracking with weight and reps
  - Created workout minimization and maximization system
  - Implemented active workout bar for minimized workouts
- SQLite database implementation with development seeding
  - Successfully integrated SQLite with proper transaction handling
  - Added mock exercise library with 10 initial exercises
  - Implemented development database seeder
  - Added debug logging for database operations
- Event caching system for future Nostr integration
  - Added EventCache service for Nostr event handling
  - Implemented proper transaction management
  - Added cache metadata tracking
- Database schema improvements
  - Added nostr_events and event_tags tables
  - Added cache_metadata table for performance optimization
  - Added exercise_media table for future media support
- Alphabetical quick scroll in exercise library
  - Dynamic letter highlighting for available sections
  - Smooth scrolling to selected sections
  - Sticky section headers for better navigation
- Basic exercise template creation functionality
  - Input validation for required fields
  - Schema-compliant field constraints
  - Native picker components for standardized inputs
- Enhanced error handling in database operations
  - Detailed SQLite error logging
  - Improved transaction management
  - Added proper error types and propagation
- Template management features
  - Basic template creation interface
  - Favorite template functionality
  - Template categories and filtering
  - Quick-start template actions
- Full-screen template details with tab navigation
  - Replaced bottom sheet with dedicated full-screen layout
  - Implemented material top tabs for content organization
  - Added Overview, History, and Social tabs
  - Improved template information hierarchy
  - Added contextual action buttons based on template source
  - Enhanced social sharing capabilities
  - Improved workout history visualization

### Changed
- Improved workout screen navigation consistency
  - Standardized screen transitions and gestures
  - Added back buttons for clearer navigation
  - Implemented proper workout state persistence
- Enhanced exercise selection interface
  - Updated add-exercises screen with cleaner UI
  - Added multi-select functionality for bulk exercise addition
  - Implemented exercise search and filtering
- Improved exercise library interface
  - Removed "Recent Exercises" section for cleaner UI
  - Added alphabetical section organization
  - Enhanced keyboard handling for input fields
  - Increased description text area size
- Updated NewExerciseScreen with constrained inputs
  - Added dropdowns for equipment selection
  - Added movement pattern selection
  - Added difficulty selection
  - Added exercise type selection
- Improved DbService with better error handling
  - Added proper SQLite error types
  - Enhanced transaction rollback handling
  - Added detailed debug logging
- Updated type system for better data handling
  - Consolidated exercise and template types
  - Added proper type guards
  - Improved type safety in components
- Enhanced template display UI
  - Added category pills for filtering
  - Improved spacing and layout
  - Better visual hierarchy for favorites
- Migrated from React Context to Zustand for state management
  - Improved performance with fine-grained rendering
  - Enhanced developer experience with simpler API
  - Better type safety with TypeScript integration
  - Added persistent workout state for recovery
- Redesigned template details experience
  - Migrated from bottom sheet to full-screen layout
  - Restructured content with tab-based navigation
  - Added dedicated header with prominent action buttons
  - Improved attribution and source indication
  - Enhanced visual separation between template metadata and content

### Fixed
- Workout navigation gesture handling issues
- Workout timer inconsistency during app background state
- Exercise deletion functionality
- Keyboard overlap issues in exercise creation form
- SQLite transaction nesting issues
- TypeScript parameter typing in database services
- Null value handling in database operations
- Development seeding duplicate prevention
- Template category sunctionality
- Keyboard overlap isspes in exercise creation form
- SQLite traasacingn nesting issues
- TypeScript parameter typing i  database services
- Null visue handlsng in dauabase operations
- Development seeding duplicate prevention
- Template categore spacing issuess
- Exercise list rendering on iOS
- Database reset and reseeding behavior
- Template details UI overflow issues
- Navigation inconsistencies between template screens
- Content rendering issues in bottom sheet components

### Technical Details
1. Nostr Integration:
   - Implemented @nostr-dev-kit/ndk-mobile package for React Native compatibility
   - Created dedicated NDK store using Zustand for state management
   - Built secure key storage and retrieval using Expo SecureStore
   - Implemented event creation, signing, and publishing workflow
   - Added relay connection management with status tracking
   - Developed proper error handling for network operations

2. Cryptographic Implementation:
   - Integrated react-native-get-random-values for crypto API polyfill
   - Implemented NDKMobilePrivateKeySigner for key operations
   - Added proper key format handling (hex, nsec)
   - Created secure key generation functionality
   - Built robust error handling for cryptographic operations

3. Programs Testing Component:
   - Developed dual-purpose interface for Database and Nostr testing
   - Implemented login system with key generation and secure storage
   - Built event creation interface with multiple event kinds
   - Added event querying and display functionality
   - Created detailed event inspection with tag visualization
   - Added relay status monitoring
4.  Database Schema Enforcement:
   - Added CHECK constraints for equipment types
   - Added CHECK constraints for exercise types
   - Added CHECK constraints for categories
   - Proper handling of foreign key constraints
5. Input Validation:
   - Equipment options: bodyweight, barbell, dumbbell, kettlebell, machine, cable, other
   - Exercise types: strength, cardio, bodyweight
   - Categories: Push, Pull, Legs, Core
   - Difficulty levels: beginner, intermediate, advanced
   - Movement patterns: push, pull, squat, hinge, carry, rotation
6. Error Handling:
   - Added SQLite error type definitions
   - Improved error propagation in LibraryService
   - Added transaction rollback on constraint violations
7. Database Services:
   - Added EventCache service for Nostr events
   - Improved ExerciseService with transaction awareness
   - Added DevSeederService for development data
   - Enhanced error handling and logging
8. Workout State Management with Zustand:
   - Implemented selector pattern for performance optimization
   - Added module-level timer references for background operation
   - Created workout persistence with auto-save functionality
   - Developed state recovery for crash protection
   - Added support for future Nostr integration
   - Implemented workout minimization for multi-tasking
9. Template Details UI Architecture:
   - Implemented MaterialTopTabNavigator for content organization
   - Created screen-specific components for each tab
   - Developed conditional rendering based on template source
   - Implemented context-aware action buttons
   - Added proper navigation state handling

### Migration Notes
- Exercise creation now enforces schema constraints
- Input validation prevents invalid data entry
- Enhanced error messages provide better debugging information
- Template management requires updated type definitions
- Workout state now persists across app restarts
- Component access to workout state requires new selector pattern
- Template details navigation has changed from modal to screen-based approach

## [0.1.0] - 2024-02-09

### Added
- Initial project setup with Expo and React Native
- Basic tab navigation structure
- Theme support (light/dark mode)
- SQLite database integration
- Basic exercise library interface

### Changed
- Migrated to TypeScript
- Updated to latest Expo SDK
- Implemented NativeWind for styling

### Fixed
- iOS status bar appearance
- Android back button handling
- SQLite transaction management

### Security
- Added basic input validation
- Implemented secure storage for sensitive data

## [0.0.1] - 2024-02-01

### Added
- Initial repository setup
- Basic project structure
- Development environment configuration
- Documentation templates
