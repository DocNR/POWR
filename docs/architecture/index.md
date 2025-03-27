# POWR App Architecture

**Last Updated:** 2025-03-25  
**Status:** Active  

## Purpose

This document provides an overview of the POWR app's architecture, including key design decisions, component organization, and technical patterns used throughout the application.

## Architecture Overview

POWR is built as a React Native application using Expo, with a local-first architecture that prioritizes offline functionality while supporting Nostr protocol integration for social features.

### Key Architectural Principles

1. **Local-First Design**: Primary data stored locally with cloud synchronization
2. **Component-Based UI**: Modular React components with clear responsibilities
3. **State Management Separation**: Business logic separated from UI components
4. **Clean Service Layer**: Service abstractions for data access and operations
5. **Protocol Integration**: Nostr protocol integration for social features
6. **Mobile-Optimized Performance**: Performance considerations for mobile constraints

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Workout    │  │  Library    │  │  Social     │  ...     │
│  │  Components │  │  Components │  │  Components │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└────────────────────────────┬────────────────────────────────┘
                            │
┌────────────────────────────┴────────────────────────────────┐
│                    State Management                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Workout    │  │  Library    │  │  Nostr      │  ...     │
│  │  Store      │  │  Store      │  │  Store      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└────────────────────────────┬────────────────────────────────┘
                            │
┌────────────────────────────┴────────────────────────────────┐
│                    Service Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Workout    │  │  Template   │  │  Social     │  ...     │
│  │  Services   │  │  Services   │  │  Services   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└────────────────────────────┬────────────────────────────────┘
                            │
┌────────────────────────────┴────────────────────────────────┐
│                    Data Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  SQLite     │  │  Nostr NDK  │  │  Cache      │  ...     │
│  │  Database   │  │  Interface  │  │  System     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Components

### UI Layer

The UI layer consists of React components organized by feature domains and following a component composition pattern:

- **Feature Screens**: Top-level screens for each major feature area
- **Composite Components**: Reusable components combining multiple base components
- **Base Components**: Simple, reusable UI elements with minimal logic
- **UI Primitives**: Foundational styled components following design system

### State Management

State management uses a combination of approaches:

- **Zustand Stores**: For global application state (auth, workouts, etc.)
- **React Context**: For feature-specific shared state
- **Local Component State**: For UI-specific ephemeral state
- **Custom Hooks**: For encapsulating state logic and side effects

### Service Layer

Services provide an abstraction over data operations:

- **Data Services**: Handle CRUD operations for specific entity types
- **Integration Services**: Manage external system integration (e.g., Nostr)
- **Utility Services**: Provide cross-cutting functionality (logging, analytics)
- **Process Services**: Orchestrate complex operations across multiple services

### Data Layer

The data layer handles persistent storage and external data access:

- **SQLite Database**: Primary storage for local data
- **NDK Interface**: Nostr protocol integration
- **Caching System**: Performance optimization for frequently used data
- **Offline Queue**: Management of operations during offline periods

## Key Design Patterns

### Repository Pattern

Data access is abstracted through repositories that provide domain-specific interfaces to the underlying storage:

```typescript
// Example repository
class WorkoutRepository {
  // Get all workouts
  async getAll(): Promise<Workout[]> {...}
  
  // Get workout by ID
  async getById(id: string): Promise<Workout | null> {...}
  
  // Save a workout
  async save(workout: Workout): Promise<void> {...}
  
  // Delete a workout
  async delete(id: string): Promise<void> {...}
}
```

### Service Pattern

Business logic is encapsulated in services that operate on the domain model:

```typescript
// Example service
class WorkoutService {
  constructor(
    private workoutRepo: WorkoutRepository,
    private exerciseRepo: ExerciseRepository
  ) {}
  
  // Complete a workout
  async completeWorkout(workout: Workout): Promise<void> {
    // Business logic here
    workout.completedAt = new Date();
    await this.workoutRepo.save(workout);
    // Additional operations
  }
}
```

### State Machine Pattern

Complex state transitions use explicit state machines to manage allowed transitions and side effects:

```typescript
// Example state machine for auth
const authStateMachine = {
  unauthenticated: {
    login: 'authenticating',
    createAccount: 'authenticating'
  },
  authenticating: {
    success: 'authenticated',
    error: 'unauthenticated'
  },
  authenticated: {
    logout: 'deauthenticating'
  },
  deauthenticating: {
    always: 'unauthenticated'
  }
};
```

### Adapter Pattern

External systems are integrated through adapters that normalize the interface:

```typescript
// Example adapter for Nostr
class NostrAdapter implements SocialPlatformAdapter {
  // Post a message
  async postMessage(content: string): Promise<string> {
    // Nostr-specific implementation
  }
  
  // Get messages from following
  async getFollowingFeed(): Promise<Message[]> {
    // Nostr-specific implementation
  }
}
```

## Folder Structure

The application code is organized by feature and technical concern:

```
/app                  - App routes and pages
  /(tabs)             - Main tab screens
  /(workout)          - Workout flow screens
  /(social)           - Social flow screens
/components           - React components
  /ui                 - Base UI components
  /workout            - Workout-specific components
  /social             - Social-specific components
/lib                  - Core application code
  /db                 - Database services
  /hooks              - Custom React hooks
  /stores             - State management
/types                - TypeScript type definitions
/utils                - Utility functions
```

## Related Documentation

- [Authentication](./authentication.md) - Authentication architecture details
- [State Management](./state_management.md) - State management approach
- [NDK Integration](../technical/ndk/comprehensive_guide.md) - NDK implementation details
- [MVP and Targeted Rebuild](../project/mvp_and_rebuild.md) - Implementation strategy
