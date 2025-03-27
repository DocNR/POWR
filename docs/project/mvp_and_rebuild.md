# MVP and Targeted Social Rebuild

**Last Updated:** 2025-03-26
**Status:** Active
**Related To:** Product Strategy, Social Integration, Architecture

## Purpose

This document outlines the roadmap for the POWR app, defining the Minimum Viable Product (MVP) scope and the subsequent targeted rebuild of social features. It prioritizes core functionality while presenting a phased approach to addressing technical challenges in the current implementation.

# POWR App Roadmap - MVP and Social Rebuild

## MVP Definition

The Minimum Viable Product (MVP) will focus on core functionality while simplifying social features:

### Core Features (MVP Priority)
- Complete workout tracking and history
- Exercise library and template management
- POWR Pack support
- Basic Nostr integration:
  - Ability to publish kind 1301 workout records
  - Ability to share workouts with kind 1 notes (quoting 1301 records)
  - NIP-89 compliance for app identification
  
### Simplified Social Implementation
- Social tab with "Coming Soon" placeholder or minimal POWR official feed
- Profile tab with limited social activity display
- Workout sharing from completion flow (with simplified UI)
- Add workout sharing from history tab

## Current Technical Challenges

### Authentication Issues
- Inconsistent auth state management causing cascading problems
- Logout process triggering uncoordinated state changes

### Subscription Management Problems
- Subscription lifecycle not properly managed
- Resources not being cleaned up consistently

### React Hook Implementation
- "Rendered fewer hooks than expected" errors
- Component lifecycle hook management issues

### Component Coupling
- Tight interdependencies between components
- Difficulty isolating fixes for individual components

## Implementation Phases

### Phase 1: MVP Stabilization (Current Focus)
- Implement fundamental architecture improvements:
  - Authentication state management with clear lifecycle hooks
  - Basic subscription management improvements
- Simplify or disable problematic social features
- Add workout sharing from history tab
- Ensure stable workout tracking, history, and template management
- Fix critical bugs in core functionality

### Phase 2: Social Foundation Rebuild (Post-MVP)
- Complete targeted rebuild of authentication and subscription management
- Implement proper data layer with caching
- Create clear separation between data and UI layers
- Develop and test in parallel with MVP branch

### Phase 3: Social Feature Re-implementation
- Gradually re-enable social features using new architecture
- Start with simplest screens (e.g., official POWR feed)
- Progress to more complex screens (Following, Global)
- Implement enhanced profile activity view

### Phase 4: Extended Features
- Amber integration for Android users
- Enhanced social features beyond original implementation
- Additional Nostr integrations and social capabilities

## Architecture Design

### 1. Authentication State Management
- Implementation of a proper state machine pattern
- Clear transitions: unauthenticated → authenticating → authenticated → deauthenticating
- Use of Zustand store (aligned with current workoutStore approach)
- Event listeners/callbacks for components to respond to auth changes

### 2. Subscription Management
- Centralized service for managing subscriptions
- Automatic tracking and cleanup of subscriptions
- Integration with component lifecycle
- Rate limiting and cooldown mechanisms

### 3. Data Layer Design 
- Clean separation between data fetching and UI components
- Proper caching with expiration policies
- Offline support strategy
- Clear interfaces for data services

### 4. UI Component Structure
- Consistent component patterns across social features
- Proper error boundaries and loading states
- Better separation of concerns between components
- Rebuilt social feed components with cleaner architecture

## Git and Release Strategy

### Branch Strategy
- Create `mvp` branch from current state
- Implement MVP simplifications and critical fixes in this branch
- In parallel, start architecture rebuild in `social-rebuild` branch
- Once MVP is released, gradually merge rebuilt components from `social-rebuild` to `main`

### Feature Flag Implementation
- Add configuration system for feature toggling
- Create conditional rendering for social features
- Define clear interfaces between components to allow swapping implementations
- Store feature flag state in persistent storage for consistency across app launches

### Release Plan
1. iOS TestFlight (MVP)
2. Implement Amber integration and final Android preparations
3. Android Google Play / APK release
4. Gradual social feature re-enablement through app updates

## Key Files to Modify

### MVP Initial Changes
- `app/(tabs)/social/_layout.tsx` - Add "Coming Soon" placeholder or simplified view
- `components/workout/WorkoutCompletionFlow.tsx` - Ensure sharing functionality is stable
- `lib/db/services/NostrWorkoutService.ts` - Review for stability and proper NIP-89 implementation
- `app/(tabs)/history/workoutHistory.tsx` - Add sharing capability

### Core Architecture Improvements
- `lib/stores/ndk.ts` - Enhance with better auth management
- `lib/hooks/useNDK.ts` - Refactor for more predictable state management
- `components/RelayInitializer.tsx` - Review for subscription management issues
- `lib/hooks/useSubscribe.ts` - Improve subscription lifecycle management

### Future Rebuild Targets (Post-MVP)
- `lib/hooks/useSocialFeed.ts` - Replace with new service
- `lib/social/socialFeedService.ts` - Refactor with cleaner architecture
- `app/(tabs)/social/*` - Rebuild social feed screens with new architecture
- `components/social/*` - Rebuild social components with consistent patterns

## Development Timeline

### 1. Architecture Design: 2-3 days
- Create detailed service interfaces
- Design state management approach
- Document component lifecycle integration

### 2. Core Service Implementation: 3-5 days
- Build authentication manager
- Implement subscription manager
- Create data fetching services

### 3. UI Component Rebuild: 5-7 days
- Rebuild one screen at a time
- Implement with new architectural patterns
- Add comprehensive error handling

### 4. Testing and Integration: 2-3 days
- Test with various network conditions
- Verify authentication edge cases
- Confirm subscription cleanup

### 5. Cleanup and Documentation: 1-2 days
- Remove deprecated code
- Document new architecture
- Create developer onboarding guide

## Risk Mitigation
- Implement feature flags to toggle between old and new implementations
- Add enhanced logging during transition
- Create robust error boundaries to prevent cascade failures
- Maintain backward compatibility for core APIs during migration

## Original Requirements and Questions

### Simplified MVP Social Experience
- Minimal or no social feed
- Replace social tab with "Coming Soon" placeholder
- Focus on core functionality:
  - Allow users to post kind 1 notes quoting 1301 workout records
  - Publishing workflow:
    1. User performs workout
    2. User completes workout and opts to share publicly
    3. User edits pre-populated kind 1 note and submits
    4. App publishes kind 1301 workout record, then publishes kind 1 note quoting the record
    5. Result: kind 1 note published to socials, kind 1301 record visible in workout history
  - Implement NIP-89 for app identification in published records

### Key Questions Addressed

#### Impact on Workout History Functionality
The targeted rebuild approach preserves workout history functionality by focusing primarily on problematic social components. Core authentication and subscription management improvements will benefit the entire app without disrupting workflow.

#### MVP Architecture Requirements
For a stable MVP with limited social features, we recommend implementing the fundamental Authentication state management and Subscription Management components. These are foundational and will improve stability across all features that use Nostr integration.

#### Caching Services
Existing caching for user metadata can likely be preserved with clearer interfaces. For the MVP, we can simplify how these caches are used rather than fully rebuilding them.

#### Workout History Sharing
Adding the ability to share workouts from the history tab would be valuable and consistent with the completion flow sharing functionality. This will require a review of local vs. Nostr event strategies.

#### Amber Integration
Amber integration should be prioritized after the initial iOS TestFlight release but before wider Android distribution.

#### Git Strategy
Creating an `mvp` branch from the current state makes sense for the MVP implementation. The feature flag approach will allow gradual introduction of rebuilt components without disrupting the user experience.


## Related Documentation

- [NDK Comprehensive Guide](../technical/ndk/comprehensive_guide.md) - Reference for NDK implementation
- [Social Architecture](../features/social/architecture.md) - Architecture for social integration using Nostr
- [Nostr Exercise NIP](../technical/nostr/exercise_nip.md) - Technical specification for workout event format
- [Subscription Analysis](../technical/ndk/subscription_analysis.md) - Analysis of NDK subscription patterns
- [Offline Queue](../technical/nostr/offline_queue.md) - Implementation details for resilient Nostr publishing
- [Authentication](../architecture/authentication.md) - Authentication flow and state management
