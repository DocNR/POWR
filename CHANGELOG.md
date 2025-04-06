# Changelog
All notable changes to the POWR project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Authentication persistence debugging tools
  - Created dedicated AuthPersistenceTest screen for diagnosing credential issues
  - Added comprehensive SecureStore key visualization
  - Implemented manual key migration triggering
  - Added test key creation functionality for simulating scenarios
  - Built key clearing utilities for testing from scratch
  - Added interactive testing workflow with detailed instructions
  - Enhanced error handling with better messaging

- React Query Android Profile Optimization System
  - Added platform-specific timeouts for network operations
  - Created fallback UI system for handling network delays
  - Implemented Android-specific safety timeouts with auto-recovery
  - Added error boundaries within profile components
  - Enhanced refresh mechanisms with better error recovery
  - Created graceful degradation UI for slow connections
  - Added real-time monitoring of loading states
  - Improved user experience during temporary API failures

### Improved
- Authentication initialization sequence
  - Added proper awaiting of NDK relay connections
  - Implemented credential migration before authentication starts
  - Enhanced AuthProvider with improved initialization flow
  - Added robustness against race conditions during startup
  - Implemented proper detection of stored credentials
  - Created key migration system between storage locations
  - Enhanced app_layout.tsx to ensure proper initialization order
  - Added detailed technical documentation for the auth system

- Profile loading performance dramatically enhanced
  - Added ultra-early content display after just 500ms
  - Implemented progressive content loading with three-tier system
  - Reduced timeouts from 5s to 4s on Android and from 4s to 3s on iOS
  - Added aggressive content rendering that prioritizes partial data
  - Enhanced render state logic to show any available content immediately
  - Improved parallel data loading for all profile elements
  - Added multiple fallback timers to ensure content is always shown
  - Enhanced safety protocol for recovering from long-loading states

- Profile overview screen architecture
  - Completely refactored to use component extraction pattern
  - Created separate presentational components (ProfileHeader, ProfileFeed)
  - Implemented centralized data hook (useProfilePageData) to fix hook ordering issues
  - Added consistent hook ordering regardless of authentication state
  - Implemented platform-specific timeout handling (6s for iOS, 8s for Android)
  - Enhanced error recovery with automatic retry system
  - Added proper TypeScript typing across all components
  - Improved banner image and profile stats loading with better error handling

- Console logging system
  - Implemented configurable module-level logging controls
  - Added quiet mode toggle for easier troubleshooting
  - Enhanced logger utility with better filtering capabilities
  - Disabled verbose feed cache and social feed logs
  - Reduced SQL query logging for better console readability
  - Improved NDK and database-related log filtering
  - Added selective module enabling/disabling functionality
  - Created comprehensive logging documentation

### Fixed
- Authentication storage key inconsistencies
  - Fixed inconsistent key naming between different auth systems
  - Implemented consistent SECURE_STORE_KEYS constants
  - Created migration utility in secureStorage.ts
  - Added key migration from legacy to standardized locations
  - Fixed AuthProvider and AuthStateManager to use the same keys
  - Enhanced NDK store to use standardized key constants
  - Added migration status tracking to prevent duplicate migrations
  - Created diagnostic tool for checking credential storage
  - Fixed ReactQueryAuthProvider to use the same key constants
  - Added detailed documentation in authentication_persistence_debug_guide.md

- Private key authentication persistence
  - Fixed inconsistent storage key naming between legacy and React Query auth systems
  - Standardized on 'nostr_privkey' for all private key storage
  - Added comprehensive logging to debug authentication initialization
  - Improved key retrieval in AuthService with legacy key detection
  - Enhanced error handling in the authentication restoration process
  - Implemented proper cross-checking between storage systems
  - Added validation and normalization for securely stored private keys

- Profile overview screen crashes
  - Fixed "Rendered more hooks than during the previous render" error
  - Eliminated "Rendered fewer hooks than expected" errors during login/logout
  - Fixed hook ordering issues with consistent hook patterns
  - Resolved banner image loading failures
  - Added proper type safety for React Query results
  - Fixed null/undefined handling in image URLs and stats data
  - Enhanced component safety with consistent rendering patterns

- Authentication persistence issues
  - Fixed private key authentication not persisting across app restarts
  - Enhanced credential storage with more reliable SecureStore integration
  - Implemented robust auth state restoration during app initialization
  - Added better error handling with credential cleanup on failed restoration
  - Created constants for SecureStore keys to ensure consistency
  - Enhanced AuthService with improved promise handling for multiple calls
  - Fixed NDK initialization to properly restore authentication state
  - Added private key normalization to handle platform-specific formatting differences
  - Added improved key validation with detailed platform-specific logging
  - Added public key caching for faster reference
  - Improved ReactQueryAuthProvider with better initialization sequence
  - Enhanced error handling throughout authentication flow
  - Added comprehensive logging for better debugging
  - Fixed race conditions in authentication state transitions
  - Implemented initialization tracking to prevent duplicate auth operations
  - Added waiting for NDK pool initialization before auth operations
  - Created one-time migration system for legacy credentials
  - Fixed delayed authentication restoration with improved sequence checks
  - Enhanced credential consistency verification at startup
  - Added test tools for diagnosing and fixing authentication issues

- Android profile screen hanging issues
  - Fixed infinite loading state on profile screen with proper timeouts
  - Enhanced NostrBandService with AbortController and abort signal support
  - Added platform-specific timeout settings (5s for Android, 10s for iOS)
  - Improved error recovery with fallback content display
  - Added graceful degradation UI for network timeouts
  - Enhanced cache utilization to improve offline experience
  - Fixed hook ordering issues in profile components 
  - Implemented max retry limits to prevent hanging
  - Added loading attempt tracking to prevent infinite loading
  - Created better diagnostics with platform-specific logging
  - Added recovery UI with retry buttons after multiple failures
  - Implemented safety timeouts to ensure content always displays

- Android profile component loading issues
  - Fixed banner image not showing up in Android profile screen
  - Enhanced useBannerImage hook with improved React Query configuration
  - Reduced staleTime to zero on both Android and iOS for immediate refresh
  - Added platform-specific optimizations for Android image loading
  - Fixed banner URI handling with proper file:// prefix management
  - Added cache busting parameter to force Android image refresh
  - Enhanced error logging with more verbose platform-specific messages
  - Improved error recovery with automatic refetch on load failures
  - Enhanced debugging logging throughout profile hooks
  - Implemented more frequent auto-refresh on Android vs iOS (20s vs 30s)
  - Added fallback messaging when banner is loading or missing

- Android and iOS profile loading issues
  - Enhanced useBannerImage hook with improved React Query configuration
  - Reduced banner image staleTime from 1 hour to 30 seconds
  - Added refetchOnMount: 'always' to ensure banner image loads on initial render
  - Completely rewrote useProfileStats hook to use React Query
  - Fixed profile follower/following counts showing stale data in Android
  - Enhanced both hooks with standardized queryKeys for better cache management
  - Improved error handling in both profile data hooks
  - Added better cache invalidation strategies for profile data

- iOS banner image loading issues
  - Added platform-specific debugging in banner image cache service
  - Enhanced BannerImageCache with detailed logging and error tracking
  - Fixed iOS path handling to ensure file:// prefix for local URIs
  - Added validation and error handling for image loading failures
  - Enhanced profile UI to track image loading errors
  - Added proper file path normalization for iOS compatibility
  - Improved React Query caching with better cache handling
  
### Added
- React Query Integration (Phase 1)
  - Implemented useAuthQuery hook for React Query-based authentication
  - Created useProfileWithQuery hook for profile data with React Query
  - Implemented useConnectivityWithQuery hook for network status management
  - Built ReactQueryAuthProvider for centralized auth integration
  - Added proper query invalidation strategies
  - Created standardized query key structure
  - Implemented optimized query client configuration
  - Built test components for React Query demonstration
  - Added type safety across all query-related functionality
  - Created proper loading and error state handling
  - Fixed hook ordering issues with conditional hook calls
  - Improved NDK initialization with more robust error handling
  - Enhanced placeholder service pattern for hooks during initialization
  - Implemented consistent hook order pattern to prevent React errors

- React Query-based Profile Data Hooks
  - Enhanced useProfileStats with React Query for better caching
  - Implemented platform-specific fetch strategies for Android and iOS
  - Added automatic timeout handling with AbortController integration
  - Created proper error state management with fallback values
  - Implemented memory leak protection with mounted state tracking
  - Added platform-aware component rendering for better UX
  - Enhanced error recovery with automatic retries
  - Implemented useRef for preventing memory leaks in asynchronous operations
  - Created optimized caching strategies with platform-specific configurations
  - Added proper dependency tracking in useEffect hooks

### Fixed
- React hooks ordering in Android
  - Fixed "Warning: React has detected a change in the order of Hooks" error in OverviewScreen
  - Implemented consistent hook calling pattern regardless of authentication state
  - Enhanced useSocialFeed hook to use consistent parameters with conditional data
  - Added comprehensive documentation on the React hooks ordering pattern used
  - Ensured all components follow the same pattern for authentication-dependent hooks
- React Query data undefined errors
  - Fixed "Query data cannot be undefined" error in profile image hooks
  - Enhanced useProfileImage and useBannerImage hooks to always return non-undefined values
  - Updated components to handle null vs undefined values properly
  - Added proper type safety for image URI handling

- Enhanced image caching for profile UI
  - Implemented ProfileImageCache service with LRU-based eviction
  - Added BannerImageCache service for profile banners with size limits
  - Created useProfileImage and useBannerImage hooks with React Query
  - Updated UserAvatar component to use React Query-based hooks
  - Enhanced Profile screen with optimized image loading
  - Updated RelayInitializer to properly initialize all image caches
  - Added automatic cache cleanup for old/unused images
  - Implemented prioritized cache eviction based on access patterns
  - Added disk space management with maximum cache size limits
  - Improved error handling in image loading/caching process

### Verified
- React Query Integration (Phase 1) has been successfully implemented and is working in production
  - Confirmed proper NDK initialization through React Query
  - Verified authentication state management with React Query hooks
  - Confirmed successful relay connections and management
  - Validated proper hook ordering in main app components
  - Verified optimal caching behavior with appropriate stale times
  - Confirmed proper profile and connectivity handling

### Fixed
- React Query Integration Testing Issues
  - Fixed critical provider duplication by properly integrating ReactQueryAuthProvider at the root level
  - Corrected query key definition to match the actual keys used by hooks (auth.current)
  - Removed multiple instances of ReactQueryAuthProvider that were causing hook ordering conflicts
  - Fixed "Rendered more hooks than during the previous render" error in test components
  - Updated test component to use the app-wide ReactQueryAuthProvider
  - Enhanced testing tool with proper isolation of concerns
  - Fixed test routes to use dedicated providers to prevent interference with global state
  - Improved auth-test component with proper nested structure for AuthProvider
  - Fixed hook ordering issues with consistent hook patterns in components
  - Added self-contained testing approach with local query client instances
  - Enhanced test layout to manage provider conflicts between different auth implementations

### Documentation
- Added comprehensive React Query integration plan to address authentication state transitions and hook ordering issues
- Created detailed technical documentation for integrating React Query with SQLite, NDK, and Amber signer
- Added detailed conflict resolution strategies for local-first Nostr app
- Implemented enhanced error handling patterns for React Query
- Developed executive summary for stakeholder review

### Fixed
- Android database initialization error (NullPointerException) by:
  - Creating a platform-specific database initialization path for Android
  - Implementing resilient error handling with step-by-step table creation
  - Simplifying SQL statements for better Android compatibility
  - Replacing dynamic imports with static imports

### Added
- Centralized Authentication System with Advanced Security
  - Implemented new AuthService for unified authentication management
  - Added support for multiple authentication methods (private key, external signer, ephemeral)
  - Created secure logout protocol to prevent unexpected state during sign-out
  - Implemented SigningQueue for better transaction handling and atomicity
  - Added AuthStateManager for centralized state management
  - Created AuthProvider component for React integration
  - Implemented feature flag system for gradual rollout
  - Added test page for verification of authentication features
  - Enhanced security with proper error propagation and state handling
  - Created clear documentation for the new authentication architecture
  - Built with TypeScript for type safety and developer experience
  - Added backward compatibility with legacy authentication
g
- Enhanced Avatar System with Robohash Integration
  - Consolidated avatar implementation into ui/avatar.tsx component
  - Added RobohashAvatar and RobohashFallback components
  - Created utility functions in utils/avatar.ts for consistent avatar generation
  - Implemented consistent avatar display using same seed (npub) across the app
  - Ensured avatar consistency between profile, header, and settings drawer
  - Enhanced user experience with friendly robot avatars for users without profile images
  - Updated application components to use the new avatar system
- Robohash integration for profile pictures
  - Added automatic robot avatar fallbacks when profile images don't load
  - Implemented consistent avatar generation based on user IDs
  - Added support for ephemeral keys and non-authenticated users
  - Created test screen to demonstrate various avatar scenarios
  - Enhanced UserAvatar component with Robohash integration
### Added
- Documentation structure overhaul for Profile feature
  - Created comprehensive Profile Tab Overview documentation
  - Added detailed documentation for each profile tab (Overview, Activity, Progress, Settings)
  - Created authentication patterns documentation with hook ordering best practices
  - Developed progress tracking implementation documentation
  - Added follower statistics documentation with NostrBand integration details
  - Created proper tab-level documentation for user profile information
  - Built structure diagrams for the profile section architecture
  - Updated documentation migration mapping
  - Created proper cross-references between all profile documents
- External Signer Support for Android (NIP-55)
  - Added Amber integration for secure private key management
  - Created ExternalSignerUtils to detect external signer apps
  - Implemented NDKAmberSigner for NIP-55 protocol support
  - Enhanced NDK store with loginWithExternalSigner functionality
  - Exposed new authentication method through useNDKAuth hook
  - Added "Sign with Amber" option to login screen
  - Added comprehensive documentation in docs/technical/nostr/external-signers.md
  - Added technical documentation in docs/technical/nostr/amber-integration-fixes.md
- Standardized login experience across profile screens
  - Created reusable NostrProfileLogin component for consistent UI
  - Added customizable messaging for context-specific instructions
  - Standardized button styling and text formatting
  - Improved visual hierarchy with consistent spacing
- Documentation structure overhaul for Library feature
  - Created new consolidated template organization documentation
  - Enhanced library feature documentation with status indicators and implementation details
  - Migrated design documents to new documentation structure
  - Archived original documents with proper reference links
  - Updated documentation migration mapping
  - Fixed broken intra-documentation links
- Documentation structure overhaul for History feature
  - Created comprehensive History tab overview documentation
  - Added detailed History List View documentation with code examples
  - Developed Calendar View documentation with implementation details
  - Created detailed Migration Guide for History API
  - Added proper archival references for legacy documents
  - Updated documentation migration mapping
  - Enhanced cross-referencing between History documents

### Fixed
- Profile tab login experience
  - Fixed error when accessing profile feed without authentication
  - Created standardized login component across all profile screens
  - Added conditional hook calling to prevent "rendered fewer hooks than expected" error
  - Improved state management during authentication transitions
  - Enhanced profile data loading with better error handling
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

# Changelog - March 8,
