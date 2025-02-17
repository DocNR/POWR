# Changelog

All notable changes to the POWR project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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

### Changed
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

### Fixed
- Exercise deletion functionality
- Keyboard overlap issues in exercise creation form
- SQLite transaction nesting issues
- TypeScript parameter typing in database services
- Null value handling in database operations
- Development seeding duplicate prevention

### Technical Details
1. Database Schema Enforcement:
   - Added CHECK constraints for equipment types
   - Added CHECK constraints for exercise types
   - Added CHECK constraints for categories
   - Proper handling of foreign key constraints

2. Input Validation:
   - Equipment options: bodyweight, barbell, dumbbell, kettlebell, machine, cable, other
   - Exercise types: strength, cardio, bodyweight
   - Categories: Push, Pull, Legs, Core
   - Difficulty levels: beginner, intermediate, advanced
   - Movement patterns: push, pull, squat, hinge, carry, rotation

3. Error Handling:
   - Added SQLite error type definitions
   - Improved error propagation in LibraryService
   - Added transaction rollback on constraint violations

4. Database Services:
   - Added EventCache service for Nostr events
   - Improved ExerciseService with transaction awareness
   - Added DevSeederService for development data
   - Enhanced error handling and logging

### Migration Notes
- Exercise creation now enforces schema constraints
- Input validation prevents invalid data entry
- Enhanced error messages provide better debugging information

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