# Workout Completion Flow Design Document

## Problem Statement
Users need a clear, privacy-respecting process for completing workouts, with options to save locally and/or publish to Nostr, update templates based on changes made during the workout, and optionally share their accomplishments socially. The current implementation lacks a structured flow for these decisions and doesn't address privacy concerns around workout metrics.

## Requirements

### Functional Requirements
- Allow users to complete workouts and save data locally
- Provide options to publish workouts to Nostr with complete or limited data
- Enable social sharing of workout accomplishments
- Support template updates based on workout modifications
- Maintain proper attribution for templates
- Support offline completion with queued publishing
- Present clear workout summary and celebration screens

### Non-Functional Requirements
- Privacy: Control over what workout metrics are published
- Performance: Completion flow should respond within 500ms
- Reliability: Work offline with 100% data retention
- Usability: Max 3 steps to complete a workout
- Security: Secure handling of Nostr keys and signing
- Consistency: Match Nostr protocol specifications (NIP-4e)

## Design Decisions

### 1. Three-Tier Storage Approach
Implement a tiered approach to workout data storage and sharing: Local Only, Publish to Nostr (Complete/Limited), and Social Sharing.

**Rationale**:
- Provides users with clear control over their data privacy
- Aligns with the Nostr protocol's decentralized nature
- Balances social engagement with privacy concerns
- Enables participation regardless of privacy preferences

**Trade-offs**:
- Additional complexity in the UI
- More complex data handling logic
- Potential confusion around data visibility

### 2. Template Update Handling
When users modify a workout during execution, offer options to: Keep Original Template, Update Existing Template, or Save as New Template.

**Rationale**:
- Supports natural evolution of workout templates
- Maintains history and attribution
- Prevents accidental template modifications
- Enables template personalization

**Trade-offs**:
- Additional decision point for users
- Version tracking complexity
- Potential template proliferation

### 3. Conflict Resolution Strategy
Implement a "Last Write Wins with Notification" approach for template conflicts, with options to keep local changes, accept remote changes, or create a fork.

**Rationale**:
- Simple to implement and understand
- Provides user awareness of conflicts
- Maintains user control over conflict resolution
- Avoids blocking workout completion flow

**Trade-offs**:
- May occasionally result in lost updates
- Requires additional UI for conflict resolution
- Can create multiple versions of templates

## Technical Design

### Core Components

```typescript
// Workout Completion Options
interface WorkoutCompletionOptions {
  storageType: 'local_only' | 'publish_complete' | 'publish_limited';
  shareOnSocial: boolean;
  socialMessage?: string;
  templateAction: 'keep_original' | 'update_existing' | 'save_as_new';
  newTemplateName?: string;
}

// Nostr Event Creation
interface NostrEventCreator {
  createWorkoutRecord(
    workout: Workout, 
    options: WorkoutCompletionOptions
  ): NostrEvent;
  
  createSocialShare(
    workoutRecord: NostrEvent, 
    message: string
  ): NostrEvent;
  
  updateTemplate(
    originalTemplate: WorkoutTemplate,
    modifiedWorkout: Workout
  ): NostrEvent;
}

// Publishing Queue
interface PublishingQueue {
  queueEvent(event: NostrEvent): Promise<void>;
  processQueue(): Promise<void>;
  getQueueStatus(): { pending: number, failed: number };
}

// Conflict Resolution
interface ConflictResolver {
  detectConflicts(localTemplate: WorkoutTemplate, remoteTemplate: WorkoutTemplate): boolean;
  resolveConflict(
    localTemplate: WorkoutTemplate, 
    remoteTemplate: WorkoutTemplate, 
    resolution: 'use_local' | 'use_remote' | 'create_fork'
  ): WorkoutTemplate;
}
```

### Workout Completion Flow

```typescript
async function completeWorkout(
  workout: Workout,
  options: WorkoutCompletionOptions
): Promise<CompletionResult> {
  // 1. Save complete workout data locally
  await saveWorkoutLocally(workout);
  
  // 2. Handle template updates if needed
  if (workout.templateId && workout.hasChanges) {
    await handleTemplateUpdate(workout, options.templateAction, options.newTemplateName);
  }
  
  // 3. Publish to Nostr if selected
  let workoutEvent: NostrEvent | null = null;
  if (options.storageType !== 'local_only') {
    const isLimited = options.storageType === 'publish_limited';
    workoutEvent = await publishWorkoutToNostr(workout, isLimited);
  }
  
  // 4. Create social share if selected
  if (options.shareOnSocial && workoutEvent) {
    await createSocialShare(workoutEvent, options.socialMessage || '');
  }
  
  // 5. Return completion status
  return {
    success: true,
    localId: workout.id,
    nostrEventId: workoutEvent?.id,
    pendingSync: !navigator.onLine
  };
}
```

## Implementation Plan

### Phase 1: Core Completion Flow
1. Implement workout completion confirmation dialog
2. Create completion options screen with storage choices
3. Build local storage functionality with workout summary
4. Add workout celebration screen with achievements
5. Implement template difference detection

### Phase 2: Nostr Integration
1. Implement workout record (kind 1301) publishing
2. Add support for limited metrics publishing
3. Create template update/versioning system
4. Implement social sharing via kind 1 posts
5. Add offline queue with sync status indicators

### Phase 3: Refinement and Enhancement
1. Add conflict detection and resolution
2. Implement template attribution preservation
3. Create version history browsing
4. Add advanced privacy controls
5. Implement achievement recognition system

## Testing Strategy

### Unit Tests
- Template difference detection
- Nostr event generation (complete and limited)
- Social post creation
- Conflict detection
- Privacy filtering logic

### Integration Tests
- End-to-end workout completion flow
- Offline completion and sync
- Template update scenarios
- Cross-device template conflict resolution
- Social sharing with quoted content

### User Testing
- Template modification scenarios
- Privacy control understanding
- Conflict resolution UX
- Workout completion satisfaction

## Observability

### Logging
- Workout completion events
- Publishing attempts and results
- Template update operations
- Conflict detection and resolution
- Offline queue processing

### Metrics
- Completion rates
- Publishing success rates
- Social sharing frequency
- Template update frequency
- Offline queue size and processing time

## Future Considerations

### Potential Enhancements
- Collaborative template editing
- Richer social sharing with images/graphics
- Template popularity and trending metrics
- Coach/trainee permission model
- Interactive workout summary visualizations

### Known Limitations
- Limited to Nostr protocol constraints
- No guaranteed deletion of published content
- Template conflicts require manual resolution
- No cross-device real-time sync
- Limited to supported NIP implementations

## Dependencies

### Runtime Dependencies
- Nostr NDK for event handling
- SQLite for local storage
- Expo SecureStore for key management
- Connectivity detection for offline mode

### Development Dependencies
- TypeScript for type safety
- React Native testing tools
- Mock Nostr relay for testing
- UI/UX prototyping tools

## Security Considerations
- Private keys never exposed to application code
- Local workout data encrypted at rest
- Clear indication of what data is being published
- Template attribution verification
- Rate limiting for publishing operations

## Rollout Strategy

### Development Phase
1. Implement core completion flow with local storage
2. Add Nostr publishing with complete/limited options
3. Implement template handling and conflict resolution
4. Add social sharing capabilities
5. Implement comprehensive testing suite

### Production Deployment
1. Release to limited beta testing group
2. Monitor completion flow metrics and error rates
3. Gather feedback on privacy controls and template handling
4. Implement refinements based on user feedback
5. Roll out to all users with clear documentation

## References
- [NIP-4e: Workout Events](https://github.com/nostr-protocol/nips/blob/4e-draft/4e.md)
- [POWR Social Features Design Document](https://github.com/docNR/powr/blob/main/docs/design/SocialDesignDocument.md)
- [Nostr NDK Documentation](https://github.com/nostr-dev-kit/ndk)
- [Offline-First Application Architecture](https://blog.flutter.io/offline-first-application-architecture-a2c4b2c61c8b)
- [React Native Performance Optimization](https://reactnative.dev/docs/performance)