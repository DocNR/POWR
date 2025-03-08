# Changelog

All notable changes to the POWR project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Template category spacing issues
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