# Changelog

All notable changes to the POWR project will be documented in this file.

## [Unreleased]

# Changelog

All notable changes to the POWR project will be documented in this file.

## [Unreleased]

### 2024-02-05
#### Added
- Basic exercise template creation functionality
  - Added input validation for required fields
  - Implemented schema-compliant field constraints
  - Added native picker components for standardized inputs
- Enhanced error handling in database operations
  - Added detailed SQLite error logging
  - Improved transaction management
  - Added proper error types and propagation

#### Changed
- Updated NewExerciseScreen with constrained inputs
  - Added dropdowns for equipment selection
  - Added movement pattern selection
  - Added difficulty selection
  - Added exercise type selection
- Improved DbService with better error handling
  - Added proper SQLite error types
  - Enhanced transaction rollback handling
  - Added detailed debug logging

#### Technical Details
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

#### Migration Notes
- Exercise creation now enforces schema constraints
- Input validation prevents invalid data entry
- Enhanced error messages provide better debugging information

### 2024-02-04

#### Added
- Complete template database schema
- Extended LibraryService with template support:
  - Template fetching
  - Exercise to template conversion
  - Template exercise handling
- Type-safe library content handling

#### Changed
- Updated database schema to version 3
- Enhanced template type system
- Improved exercise loading in library

#### Technical Details
1. Database Schema Updates:
   - Added templates table with metadata support
   - Added template_exercises junction table
   - Added template_tags table
   - Added proper constraints and foreign keys

2. Type System Improvements:
   - Added LibraryContent interface for unified content handling
   - Enhanced exercise types with format support
   - Added proper type assertions for template data

3. Library Service Enhancements:
   - Added getTemplates method with proper typing
   - Added getTemplate helper methods
   - Improved error handling and transaction support

#### Migration Notes
- New database tables for templates require migration
- Template data structure now supports future Nostr integration
- Library views should be updated to use new content types

### 2024-02-03

#### Added
- Unified type system for exercises, workouts, and templates
- New database utilities and service layer
- Nostr integration utilities:
  - Event type definitions
  - Data transformers for Nostr compatibility
  - Validation utilities for Nostr events

#### Changed
- Refactored WorkoutContext to use new unified types
- Updated LibraryService to use new database utilities
- Consolidated exercise types into a single source of truth

#### Technical Details
1. Type System Updates:
   - Created BaseExercise type as foundation
   - Added WorkoutExercise and TemplateExercise types
   - Implemented SyncableContent interface for Nostr compatibility

2. Database Improvements:
   - Added new DbService class for better transaction handling
   - Updated schema for exercise format storage
   - Added migration system

3. Nostr Integration:
   - Added event validation utilities
   - Created transformers for converting between local and Nostr formats
   - Added utility functions for tag handling

#### Migration Notes
- Database schema version increased to 2
- Exercise format data will need migration
- Existing code using old exercise types will need updates